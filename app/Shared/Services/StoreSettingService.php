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
            'primary' => '#7367f0',
            'background' => '#eef0f8',
            'foreground' => '#1a1a2e',
            'accent' => '#28c76f',
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
}
