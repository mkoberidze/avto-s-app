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

    /**
     * @return list<string>
     */
    public static function variants(string $raw): array
    {
        $normalized = self::normalize($raw);
        $digits = preg_replace('/\D+/', '', $normalized) ?? '';
        $local = str_starts_with($digits, '995') ? substr($digits, 3) : $digits;

        return array_values(array_unique(array_filter([
            $normalized,
            $digits,
            $local,
            $local !== '' ? '995'.$local : '',
            $local !== '' ? '+995'.$local : '',
        ])));
    }
}
