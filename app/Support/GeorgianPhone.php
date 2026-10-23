<?php

namespace App\Support;

class GeorgianPhone
{
    public static function normalize(string $raw): string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if (str_starts_with($digits, '995') && strlen($digits) === 12) {
            return '+'.$digits;
        }
        if (strlen($digits) === 9 && str_starts_with($digits, '5')) {
            return '+995'.$digits;
        }

        return $digits === '' ? '' : '+'.$digits;
    }

    public static function isValid(string $raw): bool
    {
        return (bool) preg_match('/^\+9955\d{8}$/', self::normalize($raw));
    }
}
