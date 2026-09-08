<?php

namespace App\Modules\Promotions\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;

class PromoBanner extends Model
{
    use BelongsToMerchant;

    protected $fillable = [
        'merchant_id',
        'title',
        'title_en',
        'image',
        'link',
        'sort_order',
        'status',
    ];
}
