<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

class SyncCatalog extends Command
{
    protected $signature = 'catalog:sync';

    protected $description = 'Upsert the Neotech category and product feeds into local tables';

    public function handle(): int
    {
        ini_set('memory_limit', '512M');

        $wallStart = microtime(true);
        $startedAt = Carbon::now();
        $timeout = (int) config('catalog.timeout', 60);
        $brandKey = (string) config('catalog.brand_feature_key');

        $categoriesPayload = $this->fetchList((string) config('catalog.categories_url'), $timeout, 'categories');
        if ($categoriesPayload === null) {
            return self::FAILURE;
        }

        $productsPayload = $this->fetchList((string) config('catalog.products_url'), $timeout, 'products');
        if ($productsPayload === null) {
            return self::FAILURE;
        }

        $categoryRows = [];
        $overrides = config('catalog.category_parent_overrides', []);
        foreach ($categoriesPayload as $item) {
            if (! is_array($item) || ! isset($item['category_id'])) {
                continue;
            }
            $id = (int) $item['category_id'];
            $parentId = (string) ($item['parent_id'] ?? '0');
            $parent = $parentId === '0' || $parentId === '' ? null : (int) $parentId;
            if (array_key_exists($id, $overrides)) {
                $mapped = $overrides[$id];
                $parent = $mapped === null || $mapped === 0 || $mapped === '0' ? null : (int) $mapped;
            }
            $categoryRows[] = [
                'id' => $id,
                'parent_id' => $parent,
                'name_ka' => (string) ($item['category'] ?? ''),
                'synced_at' => $startedAt,
                'updated_at' => $startedAt,
                'created_at' => $startedAt,
            ];
        }

        $knownCategoryIds = array_flip(array_column($categoryRows, 'id'));
        $fallbacks = config('catalog.category_fallbacks', []);

        $existingProductIds = Product::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $existingSet = array_flip($existingProductIds);

        $productRows = [];
        $brands = [];
        foreach ($productsPayload as $item) {
            if (! is_array($item) || ! isset($item['product_id'])) {
                continue;
            }

            $features = $item['features'] ?? null;
            $featuresArray = is_array($features) ? $features : [];
            $brand = is_array($features) ? ($features[$brandKey] ?? null) : null;
            $brand = is_string($brand) && $brand !== '' ? $brand : null;
            if ($brand) {
                $brands[$brand] = true;
            }

            $name = (string) ($item['product'] ?? '');
            $short = isset($item['short_description']) ? (string) $item['short_description'] : '';
            $full = isset($item['full_description']) ? (string) $item['full_description'] : '';
            $images = $item['images'] ?? [];
            $id = (int) $item['product_id'];
            $categoryId = isset($item['category_id']) && $item['category_id'] !== '' ? (int) $item['category_id'] : null;
            if ($categoryId !== null && ! isset($knownCategoryIds[$categoryId])) {
                $mapped = $fallbacks[$categoryId] ?? null;
                if ($mapped !== null) {
                    $categoryId = (int) $mapped;
                }
            }

            $productRows[] = [
                'id' => $id,
                'product_code' => (string) ($item['product_code'] ?? ''),
                'category_id' => $categoryId,
                'name_ka' => $name,
                'short_description_ka' => $short === '' ? null : $short,
                'description_ka' => $full === '' ? null : $full,
                'price' => (float) ($item['price'] ?? 0),
                'in_stock' => ($item['in_stock'] ?? null) === '1' || ($item['in_stock'] ?? null) === 1 || ($item['in_stock'] ?? null) === true,
                'stock_level' => isset($item['amount']) ? (string) $item['amount'] : null,
                'brand' => $brand,
                'features' => json_encode($featuresArray, JSON_UNESCAPED_UNICODE),
                'images' => json_encode(is_array($images) ? array_values($images) : [], JSON_UNESCAPED_UNICODE),
                'in_feed' => true,
                'first_seen_at' => $startedAt,
                'synced_at' => $startedAt,
                'updated_at' => $startedAt,
                'created_at' => $startedAt,
            ];
        }

        $newCount = 0;
        foreach ($productRows as $row) {
            if (! isset($existingSet[$row['id']])) {
                $newCount++;
            }
        }

        foreach (array_chunk($categoryRows, 200) as $chunk) {
            Category::query()->upsert(
                $chunk,
                ['id'],
                ['parent_id', 'name_ka', 'synced_at', 'updated_at']
            );
        }

        $productUpdateColumns = [
            'product_code',
            'category_id',
            'name_ka',
            'short_description_ka',
            'description_ka',
            'price',
            'in_stock',
            'stock_level',
            'brand',
            'features',
            'images',
            'in_feed',
            'synced_at',
            'updated_at',
        ];

        foreach (array_chunk($productRows, 200) as $chunk) {
            Product::query()->upsert($chunk, ['id'], $productUpdateColumns);
        }

        $feedProductIds = array_column($productRows, 'id');
        $gone = Product::query()
            ->when(
                $feedProductIds === [],
                fn ($query) => $query->whereRaw('1 = 1'),
                fn ($query) => $query->whereNotIn('id', $feedProductIds)
            )
            ->update(['in_feed' => false, 'updated_at' => $startedAt]);

        $order = 1;
        foreach (config('catalog.nav_featured_ids', []) as $categoryId) {
            Category::query()
                ->where('id', $categoryId)
                ->whereNull('nav_order')
                ->update(['nav_order' => $order]);
            $order++;
        }

        $this->info(sprintf(
            'categories upserted: %d | products upserted: %d | new: %d | gone: %d | brands found: %d',
            count($categoryRows),
            count($productRows),
            $newCount,
            $gone,
            count($brands)
        ));

        $this->info(sprintf(
            'duration: %.2fs | peak memory: %.1f MB',
            microtime(true) - $wallStart,
            memory_get_peak_usage(true) / 1024 / 1024
        ));

        return self::SUCCESS;
    }

    /**
     * @return list<mixed>|null
     */
    private function fetchList(string $url, int $timeout, string $label): ?array
    {
        $path = $this->localPath($url);
        if ($path !== null) {
            $data = $this->decodeJsonList($this->readLocalFile($path, $label), $label);

            return $data;
        }

        try {
            $response = Http::timeout($timeout)->retry(2, 200)->get($url);
        } catch (\Throwable $e) {
            $this->error("Failed to fetch {$label}: ".$e->getMessage());

            return null;
        }

        if (! $response->successful()) {
            $this->error("Failed to fetch {$label}: HTTP ".$response->status());

            return null;
        }

        return $this->decodeJsonList($response->body(), $label);
    }

    private function localPath(string $url): ?string
    {
        if (str_starts_with($url, 'file://')) {
            $path = parse_url($url, PHP_URL_PATH);

            return is_string($path) && $path !== '' ? $path : null;
        }

        if (str_starts_with($url, '/') && ! str_contains($url, '://')) {
            return $url;
        }

        return null;
    }

    private function readLocalFile(string $path, string $label): ?string
    {
        if (! is_readable($path)) {
            $this->error("Failed to fetch {$label}: cannot read {$path}");

            return null;
        }

        $raw = file_get_contents($path);
        if ($raw === false) {
            $this->error("Failed to fetch {$label}: cannot read {$path}");

            return null;
        }

        return $raw;
    }

    /**
     * @return list<mixed>|null
     */
    private function decodeJsonList(?string $raw, string $label): ?array
    {
        if ($raw === null) {
            return null;
        }

        $data = json_decode($raw, true);
        if (! is_array($data) || $data === [] || ! array_is_list($data)) {
            $this->error("{$label} feed is empty or not a JSON array");

            return null;
        }

        return $data;
    }
}
