<?php

namespace App\Shared\Services;

use App\Modules\Merchants\Models\StoreSetting;

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
}
