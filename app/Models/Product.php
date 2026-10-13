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

    public const TRANSLATABLE = ['name', 'short_description', 'features', 'description'];

    public function fieldSource(string $field): mixed
    {
        return match ($field) {
            'name' => (string) ($this->name_ka ?? ''),
            'short_description' => (string) ($this->short_description_ka ?? ''),
            'description' => (string) ($this->description_ka ?? ''),
            'features' => is_array($this->features) ? $this->features : [],
            default => '',
        };
    }

    public static function sourceHash(mixed $source, string $field): string
    {
        if ($field === 'features') {
            return md5(json_encode(is_array($source) ? $source : [], JSON_UNESCAPED_UNICODE));
        }

        return md5((string) $source);
    }

    public function isManual(string $lang, string $field): bool
    {
        $manual = data_get($this->translations, "{$lang}._manual", []);

        return is_array($manual) && in_array($field, $manual, true);
    }

    public function translatedValue(string $lang, string $field): mixed
    {
        return data_get($this->translations, "{$lang}.{$field}");
    }

    public function needsTranslation(string $lang, string $field, bool $force = false): bool
    {
        if ($this->isManual($lang, $field)) {
            return false;
        }
        $source = $this->fieldSource($field);
        if ($field === 'features') {
            if (! is_array($source) || $source === []) {
                return false;
            }
        } elseif (trim((string) $source) === '') {
            return false;
        }
        $current = $this->translatedValue($lang, $field);
        $empty = $current === null || $current === '' || $current === [];
        if ($force) {
            return true;
        }
        if ($empty) {
            return true;
        }
        $stored = data_get($this->translations, "{$lang}._h.{$field}");

        return $stored !== self::sourceHash($source, $field);
    }

    public function translationState(string $lang): string
    {
        $name = $this->translatedValue($lang, 'name');
        if (! is_string($name) || trim($name) === '') {
            return 'missing';
        }

        return $this->isManual($lang, 'name') ? 'manual' : 'machine';
    }

    public function writeTranslation(string $lang, string $field, mixed $value): void
    {
        $translations = $this->translations ?? [];
        $translations[$lang][$field] = $value;
        $translations[$lang]['_h'][$field] = self::sourceHash($this->fieldSource($field), $field);
        $this->translations = $translations;
        if ($field === 'name') {
            $column = $lang === 'en' ? 'name_en' : ($lang === 'ru' ? 'name_ru' : null);
            if ($column) {
                $this->{$column} = is_string($value) && $value !== '' ? $value : null;
            }
        }
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
