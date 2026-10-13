<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Mews\Purifier\Facades\Purifier;

class CatalogController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $language = $this->language($request);

        $directCounts = Product::query()
            ->visible()
            ->selectRaw('category_id, count(*) as aggregate')
            ->groupBy('category_id')
            ->pluck('aggregate', 'category_id');

        $descendantMap = Category::descendantIdMap();

        $categories = Category::query()
            ->where('is_hidden', false)
            ->orderByRaw('nav_order is null')
            ->orderBy('nav_order')
            ->orderBy('name_ka')
            ->get();

        $payload = $categories->map(function (Category $category) use ($language, $directCounts, $descendantMap) {
            $total = 0;
            foreach ($descendantMap[(int) $category->id] ?? [(int) $category->id] as $id) {
                $total += (int) $directCounts->get($id, 0);
            }

            return [
                'id' => (string) $category->id,
                'parent_id' => $category->parent_id === null ? null : (string) $category->parent_id,
                'name' => $category->localizedName($language),
                'nav_order' => $category->nav_order,
                'product_count' => $total,
            ];
        })->values();

        return response()->json($payload);
    }

    public function brands(Request $request): JsonResponse
    {
        $rows = Product::query()
            ->visible()
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->selectRaw('brand as name, count(*) as count')
            ->groupBy('brand')
            ->orderByDesc('count')
            ->orderBy('brand')
            ->get()
            ->map(fn ($row) => [
                'name' => (string) $row->name,
                'count' => (int) $row->count,
            ])
            ->values();

        return response()->json($rows);
    }

    public function products(Request $request): JsonResponse
    {
        $language = $this->language($request);
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(60, max(1, (int) $request->query('per_page', 24)));

        $query = Product::query()->visible();

        if ($request->filled('category_id')) {
            $ids = Category::descendantIds((int) $request->query('category_id'));
            $query->whereIn('category_id', $ids);
        }

        if ($request->filled('q')) {
            $term = '%'.$request->query('q').'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('name_ka', 'like', $term)
                    ->orWhere('name_en', 'like', $term)
                    ->orWhere('name_ru', 'like', $term)
                    ->orWhere('product_code', 'like', $term)
                    ->orWhere('brand', 'like', $term);
            });
        }

        $brands = $request->query('brand', []);
        if (is_string($brands) && $brands !== '') {
            $brands = [$brands];
        }
        if (is_array($brands) && $brands !== []) {
            $query->whereIn('brand', array_values($brands));
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        if ($request->has('in_stock') && $request->boolean('in_stock')) {
            $query->where('in_stock', true);
        }

        if ($request->has('featured') && $request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        $sort = (string) $request->query('sort', 'newest');
        match ($sort) {
            'priceAsc' => $query->orderBy('price')->orderBy('id'),
            'priceDesc' => $query->orderByDesc('price')->orderBy('id'),
            'name' => $query->orderByRaw($this->nameSort($language))->orderBy('id'),
            default => $query->orderByDesc('first_seen_at')->orderByDesc('id'),
        };

        $total = (clone $query)->count();
        $products = $query->forPage($page, $perPage)->get();

        return response()->json([
            'products' => $products->map(fn (Product $product) => $this->listItem($product, $language))->values(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $language = $this->language($request);
        $product = Product::query()->visible()->find($id);
        if (! $product) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $item = $this->listItem($product, $language, allImages: true);
        $description = $product->localized('description', $language) ?? '';
        $item['description'] = $description === '' ? '' : (string) Purifier::clean($description);
        $item['features'] = (object) $product->localizedFeatures($language);
        $item['images'] = array_values($product->images ?? []);

        return response()->json($item);
    }

    private function nameSort(string $language): string
    {
        return match ($language) {
            'en' => 'COALESCE(name_en, name_ka)',
            'ru' => 'COALESCE(name_ru, name_ka)',
            default => 'name_ka',
        };
    }

    private function language(Request $request): string
    {
        $language = (string) $request->query('language', 'ka');

        return in_array($language, ['ka', 'en', 'ru'], true) ? $language : 'ka';
    }

    private function listItem(Product $product, string $language, bool $allImages = false): array
    {
        $images = array_values($product->images ?? []);
        if (! $allImages) {
            $images = $images === [] ? [] : [ $images[0] ];
        }

        return [
            'id' => (string) $product->id,
            'product_code' => $product->product_code,
            'category_id' => $product->category_id === null ? null : (string) $product->category_id,
            'name' => $product->localized('name', $language) ?? '',
            'short_description' => Product::plainText($product->localized('short_description', $language)),
            'price' => (float) $product->price,
            'in_stock' => (bool) $product->in_stock,
            'stock_level' => $product->stock_level,
            'brand' => $product->brand,
            'images' => $images,
        ];
    }
}
