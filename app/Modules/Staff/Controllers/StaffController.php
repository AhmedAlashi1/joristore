<?php

namespace App\Modules\Staff\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Modules\Merchants\Models\MerchantMember;
use App\Shared\Enums\MerchantMemberStatus;
use App\Shared\Enums\UserStatus;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = MerchantMember::query()
            ->where('merchant_id', $merchantId)
            ->with(['user', 'role'])
            ->orderByDesc('id');

        if ($search !== '') {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (MerchantMember $m) => $this->formatMember($m));

        return sendResponse($paginator, 'Staff fetched');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'role_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id')->where(function ($q) use ($merchantId) {
                    $q->where(function ($inner) use ($merchantId) {
                        $inner->whereNull('merchant_id')->orWhere('merchant_id', $merchantId);
                    })->where('key', '!=', 'owner');
                }),
            ],
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        try {
            $member = DB::transaction(function () use ($data, $merchantId, $request) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'phone' => $data['phone'] ?? null,
                    'password' => $data['password'],
                    'status' => UserStatus::Active,
                ]
            );

            if ($user->wasRecentlyCreated === false) {
                $user->update([
                    'name' => $data['name'],
                    'phone' => $data['phone'] ?? $user->phone,
                ]);
            }

            if (MerchantMember::where('merchant_id', $merchantId)->where('user_id', $user->id)->exists()) {
                throw new \RuntimeException('User is already a staff member');
            }

            $member = MerchantMember::create([
                'merchant_id' => $merchantId,
                'user_id' => $user->id,
                'role_id' => $data['role_id'],
                'status' => MerchantMemberStatus::Active,
                'invited_by' => auth()->id(),
                'invited_at' => now(),
                'joined_at' => now(),
            ]);

            $this->activityLog->log(
                'staff.created',
                'staff',
                "Staff member {$user->name} added",
                MerchantMember::class,
                $member->id,
                request: $request,
            );

            return $member->load(['user', 'role']);
        });
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        return sendResponse($this->formatMember($member), 'Staff member created');
    }

    public function show(int $id)
    {
        $member = $this->findMember($id);

        if (! $member) {
            return sendError('Staff member not found', [], 404);
        }

        return sendResponse($this->formatMember($member), 'Staff member details');
    }

    public function update(Request $request, int $id)
    {
        $member = $this->findMember($id);

        if (! $member) {
            return sendError('Staff member not found', [], 404);
        }

        if ($member->isOwner()) {
            return sendError('Cannot modify store owner', [], 422);
        }

        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('roles', 'id')->where(function ($q) use ($merchantId) {
                    $q->where(function ($inner) use ($merchantId) {
                        $inner->whereNull('merchant_id')->orWhere('merchant_id', $merchantId);
                    })->where('key', '!=', 'owner');
                }),
            ],
            'status' => 'sometimes|required|in:invited,active,inactive,suspended',
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        if (isset($data['name']) || isset($data['phone'])) {
            $member->user->update(array_filter([
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
            ]));
        }

        if (! empty($data['password'])) {
            $member->user->update(['password' => Hash::make($data['password'])]);
        }

        $member->update(array_filter([
            'role_id' => $data['role_id'] ?? null,
            'status' => isset($data['status']) ? MerchantMemberStatus::from($data['status']) : null,
        ]));

        $this->activityLog->log('staff.updated', 'staff', "Staff member {$member->user->name} updated", MerchantMember::class, $member->id, request: $request);

        return sendResponse($this->formatMember($member->fresh()->load(['user', 'role'])), 'Staff member updated');
    }

    public function destroy(Request $request, int $id)
    {
        $member = $this->findMember($id);

        if (! $member) {
            return sendError('Staff member not found', [], 404);
        }

        if ($member->isOwner()) {
            return sendError('Cannot remove store owner', [], 422);
        }

        $name = $member->user->name;
        $member->delete();

        $this->activityLog->log('staff.removed', 'staff', "Staff member {$name} removed", request: $request);

        return sendResponse([], 'Staff member removed');
    }

    public function roleOptions()
    {
        $merchantId = MerchantContext::merchantId();

        $roles = Role::query()
            ->where(function ($q) use ($merchantId) {
                $q->whereNull('merchant_id')->orWhere('merchant_id', $merchantId);
            })
            ->where('key', '!=', 'owner')
            ->orderBy('name')
            ->get(['id', 'name', 'key', 'description', 'is_system']);

        return sendResponse($roles, 'Role options fetched');
    }

    protected function findMember(int $id): ?MerchantMember
    {
        return MerchantMember::query()
            ->where('merchant_id', MerchantContext::merchantId())
            ->with(['user', 'role'])
            ->find($id);
    }

    protected function formatMember(MerchantMember $member): array
    {
        return [
            'id' => $member->id,
            'status' => $member->status->value,
            'role_id' => $member->role_id,
            'role' => $member->role?->name,
            'role_key' => $member->role?->key,
            'is_owner' => $member->isOwner(),
            'user' => [
                'id' => $member->user->id,
                'name' => $member->user->name,
                'email' => $member->user->email,
                'phone' => $member->user->phone,
            ],
            'joined_at' => $member->joined_at,
            'created_at' => $member->created_at,
        ];
    }
}
