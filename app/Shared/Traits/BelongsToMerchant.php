<?php

namespace App\Shared\Traits;

use App\Shared\Services\MerchantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToMerchant
{
    public static function bootBelongsToMerchant(): void
    {
        static::creating(function (Model $model) {
            if (! $model->merchant_id && MerchantContext::merchantId()) {
                $model->merchant_id = MerchantContext::merchantId();
            }
        });

        static::addGlobalScope('merchant', function (Builder $builder) {
            if ($merchantId = MerchantContext::merchantId()) {
                $builder->where($builder->getModel()->getTable().'.merchant_id', $merchantId);
            }
        });
    }
}
