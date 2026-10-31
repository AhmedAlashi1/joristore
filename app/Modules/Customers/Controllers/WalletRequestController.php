<?php

namespace App\Modules\Customers\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Customers\Models\CustomerWalletRequest;
use App\Modules\Customers\Services\WalletRequestService;
use App\Shared\Helpers\MoneyHelper;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WalletRequestController extends Controller
{
    public function __construct(
        protected WalletRequestService $walletRequests,
        protected ActivityLogService $activityLog,
    ) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));
        $status = trim((string) $request->input('status', ''));

        $query = CustomerWalletRequest::query()
            ->with('customer:id,first_name,last_name,phone')
            ->orderByDesc('id');

        if ($status !== '') {
            $query->where('status', $status);
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (CustomerWalletRequest $r) => $this->format($r));

        return sendResponse($paginator, 'Wallet requests fetched');
    }

    public function approve(Request $request, int $id)
    {
        $row = CustomerWalletRequest::find($id);
        if (! $row) {
            return sendError('Request not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'admin_note' => 'nullable|string|max:500',
            'admin_transfer_receipt_path' => 'nullable|string|max:500',
        ]);
        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $validated = $validator->validated();

        try {
            $updated = $this->walletRequests->approve(
                $row,
                $request->user(),
                $validated['admin_note'] ?? null,
                $validated['admin_transfer_receipt_path'] ?? null,
            );
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        $this->activityLog->log('wallet_request.approved', 'customers', "Wallet request #{$id} approved", CustomerWalletRequest::class, $id, request: $request);

        return sendResponse($this->format($updated->load('customer:id,first_name,last_name,phone')), 'Request approved');
    }

    public function reject(Request $request, int $id)
    {
        $row = CustomerWalletRequest::find($id);
        if (! $row) {
            return sendError('Request not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'admin_note' => 'nullable|string|max:500',
        ]);
        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        try {
            $updated = $this->walletRequests->reject($row, $request->user(), $validator->validated()['admin_note'] ?? null);
        } catch (\RuntimeException $e) {
            return sendError($e->getMessage(), [], 422);
        }

        $this->activityLog->log('wallet_request.rejected', 'customers', "Wallet request #{$id} rejected", CustomerWalletRequest::class, $id, request: $request);

        return sendResponse($this->format($updated->load('customer:id,first_name,last_name,phone')), 'Request rejected');
    }

    protected function format(CustomerWalletRequest $r): array
    {
        return [
            'id' => $r->id,
            'customer_id' => $r->customer_id,
            'customer_name' => $r->customer?->full_name,
            'customer_phone' => $r->customer?->phone,
            'type' => $r->type,
            'amount' => MoneyHelper::fromMinor($r->amount),
            'status' => $r->status,
            'payment_method' => $r->payment_method,
            'transfer_reference' => $r->transfer_reference,
            'account_holder_name' => $r->account_holder_name,
            'receipt_path' => $r->receipt_path,
            'receipt_url' => $r->receipt_path ? url($r->receipt_path) : null,
            'admin_transfer_receipt_path' => $r->admin_transfer_receipt_path,
            'admin_transfer_receipt_url' => $r->admin_transfer_receipt_path ? url($r->admin_transfer_receipt_path) : null,
            'customer_note' => $r->customer_note,
            'admin_note' => $r->admin_note,
            'wallet_transaction_id' => $r->wallet_transaction_id,
            'created_at' => $r->created_at,
            'processed_at' => $r->processed_at,
        ];
    }
}
