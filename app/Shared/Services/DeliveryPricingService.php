<?php

namespace App\Shared\Services;

use App\Modules\Customers\Models\CustomerAddress;
use App\Modules\Shipping\Models\DeliveryRegion;
use App\Shared\Helpers\MoneyHelper;

class DeliveryPricingService
{
    /**
     * @return array{amount_minor: int, price: float, source: 'region', region_id: int, region_name: string, street_id: null, street_name: null}
     */
    public function quote(int $merchantId, int $regionId, ?string $street = null): ?array
    {
        $region = DeliveryRegion::query()
            ->where('merchant_id', $merchantId)
            ->where('status', 'active')
            ->find($regionId);

        if (! $region) {
            return null;
        }

        return [
            'amount_minor' => (int) $region->price_amount,
            'price' => MoneyHelper::fromMinor($region->price_amount),
            'source' => 'region',
            'region_id' => $region->id,
            'region_name' => $region->name,
            'street_id' => null,
            'street_name' => null,
        ];
    }

    public function quoteForAddress(int $merchantId, CustomerAddress $address): ?array
    {
        if (! $address->delivery_region_id) {
            return null;
        }

        return $this->quote($merchantId, (int) $address->delivery_region_id);
    }
}
