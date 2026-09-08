<?php

namespace App\Modules\Dashboard\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use BelongsToMerchant;

    public $timestamps = false;

    protected $fillable = [
        'merchant_id', 'user_id', 'type', 'title', 'message', 'data', 'read_at', 'created_at',
    ];

    protected function casts(): array
    {
        return ['data' => 'array', 'read_at' => 'datetime', 'created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
