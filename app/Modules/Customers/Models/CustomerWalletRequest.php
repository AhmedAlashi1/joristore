<?php

namespace App\Modules\Customers\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerWalletRequest extends Model
{
    public const TYPE_TOP_UP = 'top_up';

    public const TYPE_WITHDRAWAL = 'withdrawal';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'customer_id', 'type', 'amount', 'status', 'payment_method', 'transfer_reference', 'account_holder_name',
        'receipt_path', 'admin_transfer_receipt_path',
        'customer_note', 'admin_note', 'wallet_transaction_id',
        'processed_by', 'processed_at',
    ];

    protected function casts(): array
    {
        return ['processed_at' => 'datetime'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(CustomerWalletTransaction::class, 'wallet_transaction_id');
    }

    public function processedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
