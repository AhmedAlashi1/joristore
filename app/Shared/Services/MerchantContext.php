<?php

namespace App\Shared\Services;

use App\Models\User;
use App\Modules\Merchants\Models\MerchantMember;

class MerchantContext
{
    protected static ?MerchantMember $member = null;

    protected static ?int $storefrontMerchantId = null;

    protected static $storefrontStore = null;

    public static function set(MerchantMember $member): void
    {
        static::$member = $member;
    }

    public static function setStorefront(int $merchantId, $store): void
    {
        static::$storefrontMerchantId = $merchantId;
        static::$storefrontStore = $store;
    }

    public static function member(): ?MerchantMember
    {
        return static::$member;
    }

    public static function merchantId(): ?int
    {
        return static::$storefrontMerchantId ?? static::$member?->merchant_id;
    }

    public static function merchant()
    {
        if (static::$storefrontStore) {
            return static::$storefrontStore->merchant ?? static::$storefrontStore->loadMissing('merchant')->merchant;
        }

        return static::$member?->merchant;
    }

    public static function store()
    {
        if (static::$storefrontStore) {
            return static::$storefrontStore;
        }

        return static::$member?->merchant?->store;
    }

    public static function clear(): void
    {
        static::$member = null;
        static::$storefrontMerchantId = null;
        static::$storefrontStore = null;
    }

    public static function resolveForUser(User $user): ?MerchantMember
    {
        return $user->activeMerchantMember();
    }
}
