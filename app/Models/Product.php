<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    public $incrementing = false;

    protected $keyType = 'int';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'in_stock' => 'boolean',
            'in_feed' => 'boolean',
            'is_hidden' => 'boolean',
            'is_featured' => 'boolean',
            'features' => 'array',
            'images' => 'array',
            'translations' => 'array',
            'first_seen_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('in_feed', true)->where('is_hidden', false);
    }

    public function localized(string $field, string $language): ?string
    {
        if ($language !== 'ka') {
            $translated = data_get($this->translations, "{$language}.{$field}");
            if (is_string($translated) && $translated !== '') {
                return $translated;
            }
        }

        return match ($field) {
            'name' => $this->name_ka,
            'short_description' => $this->short_description_ka,
            'description' => $this->description_ka,
            default => null,
        };
    }

    public function localizedFeatures(string $language): array
    {
        if ($language !== 'ka') {
            $translated = data_get($this->translations, "{$language}.features");
            if (is_array($translated) && $translated !== []) {
                return $translated;
            }
        }

        return is_array($this->features) ? $this->features : [];
    }

    public static function plainText(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }

        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
