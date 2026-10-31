<?php

namespace App\Shared\Support;

class PhoneNormalizer
{
    /** Normalize mobile for store login/register (Palestine/Israel-style 05xxxxxxxx). */
    public static function normalize(?string $phone): string
    {
        if ($phone === null) {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '972')) {
            $digits = '0'.substr($digits, 3);
        } elseif (str_starts_with($digits, '970')) {
            $digits = '0'.substr($digits, 3);
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '5')) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
