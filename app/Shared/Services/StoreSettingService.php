<?php

namespace App\Shared\Services;

use App\Modules\Merchants\Models\StoreSetting;
use App\Shared\Support\PaymentMethods;

class StoreSettingService
{
    public static function get(int $storeId, string $key, ?string $default = null): ?string
    {
        $row = StoreSetting::query()->where('store_id', $storeId)->where('key', $key)->first();

        return $row?->value ?? $default;
    }

    public static function set(int $storeId, string $key, ?string $value, bool $isPublic = false, string $group = 'general'): void
    {
        StoreSetting::query()->updateOrCreate(
            ['store_id' => $storeId, 'key' => $key],
            ['value' => $value, 'type' => 'text', 'group' => $group, 'is_public' => $isPublic]
        );
    }

    /** @return array<string, string|null> */
    public static function getLegal(int $storeId): array
    {
        $keys = ['terms_ar', 'terms_en', 'privacy_ar', 'privacy_en'];

        return collect($keys)->mapWithKeys(fn ($k) => [$k => self::get($storeId, $k)])->all();
    }

    /** @return array<string, string> */
    public static function themeDefaults(): array
    {
        return [
            'primary' => '#6c63ff',
            'background' => '#f3f4fb',
            'foreground' => '#141626',
            'accent' => '#22b07d',
        ];
    }

    /** @return array<string, string> */
    public static function getTheme(int $storeId): array
    {
        $defaults = self::themeDefaults();

        return [
            'primary' => self::get($storeId, 'theme_primary', $defaults['primary']) ?? $defaults['primary'],
            'background' => self::get($storeId, 'theme_background', $defaults['background']) ?? $defaults['background'],
            'foreground' => self::get($storeId, 'theme_foreground', $defaults['foreground']) ?? $defaults['foreground'],
            'accent' => self::get($storeId, 'theme_accent', $defaults['accent']) ?? $defaults['accent'],
        ];
    }

    /** @param  array<string, string|null>  $data */
    public static function setTheme(int $storeId, array $data): void
    {
        $allowed = array_keys(self::themeDefaults());

        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            self::set($storeId, 'theme_'.$key, $data[$key], true, 'theme');
        }
    }

    /** @return array<string, string|null> */
    public static function socialKeys(): array
    {
        return [
            'facebook' => 'social_facebook',
            'instagram' => 'social_instagram',
            'twitter' => 'social_twitter',
            'tiktok' => 'social_tiktok',
            'snapchat' => 'social_snapchat',
            'youtube' => 'social_youtube',
            'whatsapp' => 'social_whatsapp',
        ];
    }

    /** @return array<string, string|null> */
    public static function getSocial(int $storeId): array
    {
        $out = [];
        foreach (self::socialKeys() as $key => $settingKey) {
            $out[$key] = self::get($storeId, $settingKey);
        }

        return $out;
    }

    /** @param  array<string, string|null>  $data */
    public static function setSocial(int $storeId, array $data): void
    {
        foreach (self::socialKeys() as $key => $settingKey) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $value = $data[$key];
            self::set($storeId, $settingKey, $value ?: null, true, 'social');
        }
    }

    public static function defaultCurrencySymbol(): string
    {
        return '₪';
    }

    public static function getCurrencySymbol(int $storeId): string
    {
        return self::get($storeId, 'currency_symbol', self::defaultCurrencySymbol())
            ?? self::defaultCurrencySymbol();
    }

    public static function setCurrencySymbol(int $storeId, ?string $symbol): void
    {
        $value = trim((string) $symbol);
        self::set(
            $storeId,
            'currency_symbol',
            $value !== '' ? $value : self::defaultCurrencySymbol(),
            true,
            'general',
        );
    }

    /** @return list<array<string, mixed>> */
    public static function paymentMethodsDefaults(): array
    {
        return [
            [
                'id' => 'cash_on_delivery',
                'enabled' => true,
                'label_ar' => 'دفع عند الاستلام',
                'label_en' => 'Cash on delivery',
                'instructions_ar' => '',
                'instructions_en' => '',
                'requires_receipt' => false,
                'qr_image' => null,
            ],
            [
                'id' => 'jawwal_pay',
                'enabled' => true,
                'label_ar' => 'جوال بي',
                'label_en' => 'Jawwal Pay',
                'instructions_ar' => 'امسح رمز QR وادفع المبلغ، ثم ارفع صورة الإشعار.',
                'instructions_en' => 'Scan the QR code, pay the amount, then upload the receipt screenshot.',
                'requires_receipt' => true,
                'qr_image' => null,
            ],
            [
                'id' => 'pal_pay',
                'enabled' => true,
                'label_ar' => 'بال بي',
                'label_en' => 'PalPay',
                'instructions_ar' => 'امسح رمز QR وادفع المبلغ، ثم ارفع صورة الإشعار.',
                'instructions_en' => 'Scan the QR code, pay the amount, then upload the receipt screenshot.',
                'requires_receipt' => true,
                'qr_image' => null,
            ],
            [
                'id' => 'wallet',
                'enabled' => true,
                'label_ar' => 'المحفظة',
                'label_en' => 'Wallet',
                'instructions_ar' => '',
                'instructions_en' => '',
                'requires_receipt' => false,
                'qr_image' => null,
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function getPaymentMethods(int $storeId): array
    {
        $raw = self::get($storeId, 'payment_methods_json');
        $saved = $raw ? json_decode($raw, true) : [];
        if (! is_array($saved)) {
            $saved = [];
        }

        return self::mergePaymentMethodsDefaults($saved);
    }

    /** @param  list<array<string, mixed>>  $saved */
    /** @return list<array<string, mixed>> */
    protected static function mergePaymentMethodsDefaults(array $saved): array
    {
        $byId = collect($saved)->keyBy('id');
        $out = [];
        foreach (self::paymentMethodsDefaults() as $def) {
            $id = $def['id'];
            $row = $byId->get($id);
            $merged = is_array($row) ? array_merge($def, $row) : $def;
            $merged['id'] = $id;
            $merged['enabled'] = (bool) ($merged['enabled'] ?? false);
            $merged['requires_receipt'] = (bool) ($merged['requires_receipt'] ?? false);
            $out[] = $merged;
        }

        return $out;
    }

    /** @param  list<array<string, mixed>>  $methods */
    public static function setPaymentMethods(int $storeId, array $methods): void
    {
        $allowed = array_flip(PaymentMethods::STOREFRONT);
        $byId = collect($methods)->keyBy('id');
        $normalized = [];

        foreach (self::paymentMethodsDefaults() as $def) {
            $id = $def['id'];
            if (! isset($allowed[$id])) {
                continue;
            }
            $row = $byId->get($id);
            if (! is_array($row)) {
                $row = $def;
            }
            $normalized[] = [
                'id' => $id,
                'enabled' => (bool) ($row['enabled'] ?? $def['enabled']),
                'label_ar' => mb_substr((string) ($row['label_ar'] ?? $def['label_ar']), 0, 120),
                'label_en' => mb_substr((string) ($row['label_en'] ?? $def['label_en']), 0, 120),
                'instructions_ar' => (string) ($row['instructions_ar'] ?? ''),
                'instructions_en' => (string) ($row['instructions_en'] ?? ''),
                'requires_receipt' => (bool) ($row['requires_receipt'] ?? $def['requires_receipt']),
                'qr_image' => ! empty($row['qr_image']) ? (string) $row['qr_image'] : null,
            ];
        }

        self::set(
            $storeId,
            'payment_methods_json',
            json_encode($normalized, JSON_UNESCAPED_UNICODE),
            true,
            'payments',
        );
    }

    /** @return list<array<string, mixed>> */
    public static function getEnabledPaymentMethods(int $storeId): array
    {
        return array_values(array_filter(
            self::getPaymentMethods($storeId),
            fn (array $m) => (bool) ($m['enabled'] ?? false),
        ));
    }

    /** @return array<string, mixed>|null */
    public static function findPaymentMethod(int $storeId, string $id): ?array
    {
        foreach (self::getPaymentMethods($storeId) as $method) {
            if (($method['id'] ?? '') === $id) {
                return $method;
            }
        }

        return null;
    }
}
