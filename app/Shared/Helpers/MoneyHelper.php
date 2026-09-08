<?php

namespace App\Shared\Helpers;

class MoneyHelper
{
    public static function toMinor(float $amount): int
    {
        return (int) round($amount * 100);
    }

    public static function fromMinor(?int $amount): float
    {
        return ($amount ?? 0) / 100;
    }
}
