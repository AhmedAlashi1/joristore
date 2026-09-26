<?php

namespace App\Modules\Catalog\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Gym extends Model
{
    use BelongsToMerchant, SoftDeletes;

    protected $fillable = [
        'merchant_id', 'name', 'name_en', 'sector', 'city',
        'latitude', 'longitude', 'cover_image', 'gallery',
        'description', 'subscription_info', 'opening_hours',
        'status', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'opening_hours' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }
}
