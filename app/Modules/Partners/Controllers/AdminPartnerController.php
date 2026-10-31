<?php

namespace App\Modules\Partners\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Partners\Models\Partner;
use App\Modules\Partners\Models\PartnerAccount;
use App\Modules\Partners\Services\PartnerCommissionService;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use App\Shared\Support\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdminPartnerController extends Controller
{
    public function __construct(
        protected ActivityLogService $activityLog,
        protected PartnerCommissionService $commissions,
    ) {}

    public function options()
    {
        $rows = Partner::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'name_en', 'default_commission_type', 'default_commission_value']);

        return sendResponse($rows->map(fn (Partner $p) => [
            'id' => $p->id,
            'name' => $p->name,
            'name_en' => $p->name_en,
            'default_commission_type' => $p->default_commission_type,
            'default_commission_value' => $p->default_commission_type === 'percentage'
                ? $p->default_commission_value
                : MoneyHelper::fromMinor($p->default_commission_value),
        ]), 'Partner options');
    }

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Partner::query()->with(['account', 'gym'])->orderByDesc('id');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_phone', 'like', "%{$search}%")
                    ->orWhereHas('account', fn ($a) => $a->where('login_phone', 'like', "%{$search}%"));
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Partner $p) => $this->format($p, true));

        return sendResponse($paginator, 'Partners fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'gym_id' => 'nullable|integer|exists:gyms,id',
            'contact_phone' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email|max:255',
            'city' => 'nullable|string|max:120',
            'notes' => 'nullable|string|max:2000',
            'status' => 'nullable|in:active,inactive',
            'login_phone' => 'required|string|max:20|unique:partner_accounts,login_phone',
            'password' => 'required|string|min:6',
            'default_commission_type' => 'nullable|in:percentage,fixed_amount',
            'default_commission_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $commissionFields = $this->parseDefaultCommission($data);
        if ($commissionFields instanceof \Illuminate\Http\JsonResponse) {
            return $commissionFields;
        }

        $loginPhone = PhoneNormalizer::normalize($data['login_phone']);
        if (PartnerAccount::where('login_phone', $loginPhone)->exists()) {
            return sendError('Login phone already used for another partner', [], 422);
        }

        $partner = DB::transaction(function () use ($data, $loginPhone, $commissionFields) {
            $partner = Partner::create([
                'name' => $data['name'],
                'name_en' => $data['name_en'] ?? null,
                'gym_id' => $data['gym_id'] ?? null,
                'contact_phone' => isset($data['contact_phone']) ? PhoneNormalizer::normalize($data['contact_phone']) : null,
                'contact_email' => $data['contact_email'] ?? null,
                'city' => $data['city'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'] ?? 'active',
                ...$commissionFields,
            ]);

            PartnerAccount::create([
                'partner_id' => $partner->id,
                'login_phone' => $loginPhone,
                'password' => $data['password'],
            ]);

            return $partner->load(['account', 'gym']);
        });

        $this->activityLog->log('partner.created', 'partners', "Partner {$partner->name} created", Partner::class, $partner->id, request: $request);

        return sendResponse($this->format($partner, true), 'Partner created');
    }

    public function show(int $id)
    {
        $partner = Partner::with(['account', 'gym'])->find($id);
        if (! $partner) {
            return sendError('Partner not found', [], 404);
        }

        $stats = [
            'pending_commission' => \App\Shared\Helpers\MoneyHelper::fromMinor($this->commissions->pendingTotalForPartner($partner->id)),
            'paid_commission' => \App\Shared\Helpers\MoneyHelper::fromMinor(
                (int) $partner->commissions()->where('status', 'paid')->sum('commission_amount')
            ),
        ];

        return sendResponse([
            ...$this->format($partner, true),
            'stats' => $stats,
        ], 'Partner details');
    }

    public function update(Request $request, int $id)
    {
        $partner = Partner::with('account')->find($id);
        if (! $partner) {
            return sendError('Partner not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'gym_id' => 'nullable|integer|exists:gyms,id',
            'contact_phone' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email|max:255',
            'city' => 'nullable|string|max:120',
            'notes' => 'nullable|string|max:2000',
            'status' => 'nullable|in:active,inactive',
            'login_phone' => 'sometimes|required|string|max:20|unique:partner_accounts,login_phone,'.($partner->account?->id ?? 'NULL'),
            'password' => 'nullable|string|min:6',
            'default_commission_type' => 'nullable|in:percentage,fixed_amount',
            'default_commission_value' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $commissionFields = null;
        if (array_key_exists('default_commission_type', $data) || array_key_exists('default_commission_value', $data)) {
            $commissionFields = $this->parseDefaultCommission($data);
            if ($commissionFields instanceof \Illuminate\Http\JsonResponse) {
                return $commissionFields;
            }
        }

        DB::transaction(function () use ($partner, $data, $commissionFields) {
            $update = array_filter([
                'name' => $data['name'] ?? null,
                'name_en' => array_key_exists('name_en', $data) ? $data['name_en'] : null,
                'gym_id' => array_key_exists('gym_id', $data) ? $data['gym_id'] : null,
                'contact_phone' => array_key_exists('contact_phone', $data) && $data['contact_phone']
                    ? PhoneNormalizer::normalize($data['contact_phone']) : (array_key_exists('contact_phone', $data) ? null : null),
                'contact_email' => array_key_exists('contact_email', $data) ? $data['contact_email'] : null,
                'city' => array_key_exists('city', $data) ? $data['city'] : null,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : null,
                'status' => $data['status'] ?? null,
            ], fn ($v) => $v !== null);
            if ($commissionFields !== null) {
                $update = array_merge($update, $commissionFields);
            }
            $partner->update($update);

            if (! empty($data['login_phone']) || ! empty($data['password'])) {
                $account = $partner->account;
                if (! $account) {
                    $account = PartnerAccount::create(['partner_id' => $partner->id, 'login_phone' => '', 'password' => '']);
                }
                $accUpdate = [];
                if (! empty($data['login_phone'])) {
                    $accUpdate['login_phone'] = PhoneNormalizer::normalize($data['login_phone']);
                }
                if (! empty($data['password'])) {
                    $accUpdate['password'] = $data['password'];
                }
                if ($accUpdate) {
                    $account->update($accUpdate);
                }
            }
        });

        $this->activityLog->log('partner.updated', 'partners', "Partner {$partner->name} updated", Partner::class, $partner->id, request: $request);

        return sendResponse($this->format($partner->fresh(['account', 'gym']), true), 'Partner updated');
    }

    public function destroy(Request $request, int $id)
    {
        $partner = Partner::find($id);
        if (! $partner) {
            return sendError('Partner not found', [], 404);
        }

        $name = $partner->name;
        $partner->delete();
        $this->activityLog->log('partner.deleted', 'partners', "Partner {$name} deleted", request: $request);

        return sendResponse([], 'Partner deleted');
    }

    protected function format(Partner $p, bool $withAccount = false): array
    {
        $row = [
            'id' => $p->id,
            'name' => $p->name,
            'name_en' => $p->name_en,
            'gym_id' => $p->gym_id,
            'gym_name' => $p->gym?->name,
            'contact_phone' => $p->contact_phone,
            'contact_email' => $p->contact_email,
            'city' => $p->city,
            'notes' => $p->notes,
            'status' => $p->status,
            'default_commission_type' => $p->default_commission_type,
            'default_commission_value' => $p->default_commission_type === 'percentage'
                ? $p->default_commission_value
                : ($p->default_commission_value !== null ? MoneyHelper::fromMinor($p->default_commission_value) : null),
        ];

        if ($withAccount && $p->relationLoaded('account')) {
            $row['login_phone'] = $p->account?->login_phone;
        }

        return $row;
    }

    /**
     * @return array<string, mixed>|\Illuminate\Http\JsonResponse
     */
    protected function parseDefaultCommission(array $data)
    {
        $type = $data['default_commission_type'] ?? null;
        $value = $data['default_commission_value'] ?? null;

        if (! $type && ($value === null || $value === '')) {
            return [
                'default_commission_type' => null,
                'default_commission_value' => null,
            ];
        }

        if (! $type || $value === null || $value === '') {
            return sendError('Default commission type and value must both be set', [], 422);
        }

        if ($type === 'percentage' && (float) $value > 100) {
            return sendError('Commission percentage cannot exceed 100', [], 422);
        }

        return [
            'default_commission_type' => $type,
            'default_commission_value' => $type === 'percentage'
                ? (int) $value
                : MoneyHelper::toMinor((float) $value),
        ];
    }
}
