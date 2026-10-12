<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    public $incrementing = false;

    protected $keyType = 'int';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'translations' => 'array',
            'is_hidden' => 'boolean',
            'nav_order' => 'integer',
            'synced_at' => 'datetime',
        ];
    }

    public function localizedName(string $language): string
    {
        if ($language !== 'ka') {
            $translated = data_get($this->translations, "{$language}.name");
            if (is_string($translated) && $translated !== '') {
                return $translated;
            }
        }

        return $this->name_ka;
    }

    /**
     * @return array<int, list<int>>
     */
    public static function descendantIdMap(): array
    {
        $all = static::query()->get(['id', 'parent_id']);
        $byParent = [];
        foreach ($all as $category) {
            $byParent[(int) $category->parent_id][] = (int) $category->id;
        }

        $map = [];
        foreach ($all as $category) {
            $id = (int) $category->id;
            $ids = [$id];
            $stack = [$id];
            while ($stack) {
                $parent = array_pop($stack);
                foreach ($byParent[$parent] ?? [] as $child) {
                    $ids[] = $child;
                    $stack[] = $child;
                }
            }
            $map[$id] = $ids;
        }

        return $map;
    }

    /**
     * @return list<int>
     */
    public static function descendantIds(int $rootId): array
    {
        return static::descendantIdMap()[$rootId] ?? [$rootId];
    }
}
