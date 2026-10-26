<?php

namespace App\Support;

class AdminPhones
{
    /**
     * @return list<string>
     */
    public static function all(): array
    {
        $phones = array_merge(
            [(string) config('admin.phone')],
            (array) config('admin.phones', [])
        );

        $normalized = [];
        foreach ($phones as $phone) {
            $value = GeorgianPhone::normalize((string) $phone);
            if ($value !== '') {
                $normalized[$value] = $value;
            }
        }

        return array_values($normalized);
    }

    public static function contains(string $phone): bool
    {
        return in_array($phone, self::all(), true);
    }
}
