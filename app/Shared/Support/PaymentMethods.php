<?php

namespace App\Shared\Support;

use App\Shared\Services\StoreSettingService;

class PaymentMethods
{
    /** @var list<string> */
    public const ALL = [
        'cash_on_delivery',
        'bank_transfer',
        'card',
        'wallet',
        'jawwal_pay',
        'pal_pay',
    ];

    /** Methods configurable in admin + storefront checkout. */
    /** @var list<string> */
    public const STOREFRONT = [
        'cash_on_delivery',
        'jawwal_pay',
        'pal_pay',
        'wallet',
    ];

    /** @var list<string> */
    public const ONLINE_RECEIPT = ['jawwal_pay', 'pal_pay'];

    public static function validationRule(): string
    {
        return 'in:'.implode(',', self::ALL);
    }

    public static function requiresReceipt(string $method, ?int $storeId = null): bool
    {
        if ($storeId) {
            $row = StoreSettingService::findPaymentMethod($storeId, $method);
            if ($row) {
                return (bool) ($row['requires_receipt'] ?? false);
            }
        }

        return in_array($method, self::ONLINE_RECEIPT, true);
    }

    public static function isEnabledForStore(int $storeId, string $method): bool
    {
        $row = StoreSettingService::findPaymentMethod($storeId, $method);

        return $row ? (bool) ($row['enabled'] ?? false) : false;
    }
}
