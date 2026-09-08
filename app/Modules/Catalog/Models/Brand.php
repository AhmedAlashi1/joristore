<?php

namespace App\Modules\Catalog\Models;

use App\Shared\Traits\BelongsToMerchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use BelongsToMerchant, SoftDeletes;

    protected $fillable = [
        'merchant_id', 'name', 'slug', 'logo', 'description', 'status',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
