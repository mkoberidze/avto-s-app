<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Support\BrandPromotions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Mews\Purifier\Facades\Purifier;

class CatalogController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
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

        $payload = $categories->map(function (Category $category) use ($directCounts, $descendantMap) {
            $total = 0;
            foreach ($descendantMap[(int) $category->id] ?? [(int) $category->id] as $id) {
                $total += (int) $directCounts->get($id, 0);
            }

            return [
                'id' => (string) $category->id,
                'parent_id' => $category->parent_id === null ? null : (string) $category->parent_id,
                'name' => $category->name_ka,
                'nav_order' => $category->nav_order,
                'product_count' => $total,
            ];
        })->filter(fn (array $row) => $row['product_count'] > 0)->values();

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
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(60, max(1, (int) $request->query('per_page', 24)));

        $now = now();
        $query = Product::query()
            ->visible()
            ->leftJoin('brand_promotions as active_promotions', function ($join) use ($now) {
                $join->on('products.brand', '=', 'active_promotions.brand')
                    ->where('active_promotions.is_active', true)
                    ->where('active_promotions.starts_at', '<=', $now)
                    ->where('active_promotions.ends_at', '>', $now);
            })
            ->select('products.*');
        $discountedPrice = 'CASE WHEN active_promotions.id IS NOT NULL AND products.price > 0 '
            .'THEN ROUND(products.price * (100 - active_promotions.discount_percent) / 100, 2) '
            .'ELSE products.price END';

        if ($request->filled('category_id')) {
            $ids = Category::descendantIds((int) $request->query('category_id'));
            $query->whereIn('category_id', $ids);
        }

        if ($request->filled('q')) {
            $term = '%'.$request->query('q').'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('products.name_ka', 'like', $term)
                    ->orWhere('products.product_code', 'like', $term)
                    ->orWhere('products.brand', 'like', $term);
            });
        }

        $brands = $request->query('brand', []);
        if (is_string($brands) && $brands !== '') {
            $brands = [$brands];
        }
        if (is_array($brands) && $brands !== []) {
            $query->whereIn('products.brand', array_values($brands));
        }

        if ($request->filled('min_price')) {
            $query->whereRaw("{$discountedPrice} >= ?", [(float) $request->query('min_price')]);
        }
        if ($request->filled('max_price')) {
            $query->whereRaw("{$discountedPrice} <= ?", [(float) $request->query('max_price')]);
        }

        if ($request->has('in_stock') && $request->boolean('in_stock')) {
            $query->where('in_stock', true);
        }

        if ($request->has('featured') && $request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        $query->orderByDesc('in_stock');
        $sort = (string) $request->query('sort', 'newest');
        match ($sort) {
            'priceAsc' => $query->orderByRaw("{$discountedPrice} asc")->orderBy('products.id'),
            'priceDesc' => $query->orderByRaw("{$discountedPrice} desc")->orderBy('products.id'),
            'name' => $query->orderBy('products.name_ka')->orderBy('products.id'),
            default => $query->orderByDesc('products.first_seen_at')->orderByDesc('products.id'),
        };

        $total = (clone $query)->count();
        $products = $query->forPage($page, $perPage)->get();
        $promotions = BrandPromotions::activeMap();

        return response()->json([
            'products' => $products->map(fn (Product $product) => $this->listItem($product, promotions: $promotions))->values(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $product = Product::query()->visible()->find($id);
        if (! $product) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $item = $this->listItem($product, allImages: true, promotions: BrandPromotions::activeMap());
        $description = (string) ($product->description_ka ?? '');
        $item['description'] = $description === '' ? '' : (string) Purifier::clean($description);
        $item['features'] = (object) (is_array($product->features) ? $product->features : []);
        $item['images'] = array_values($product->images ?? []);

        return response()->json($item);
    }

    private function listItem(Product $product, bool $allImages = false, array $promotions = []): array
    {
        $images = array_values($product->images ?? []);
        $pricing = BrandPromotions::pricing($product, $promotions);
        if (! $allImages) {
            $images = $images === [] ? [] : [ $images[0] ];
        }

        return [
            'id' => (string) $product->id,
            'product_code' => $product->product_code,
            'category_id' => $product->category_id === null ? null : (string) $product->category_id,
            'name' => $product->name_ka ?? '',
            'short_description' => Product::plainText($product->short_description_ka),
            'price' => $pricing['price'],
            'price_on_request' => ! $product->isPriced(),
            'in_stock' => (bool) $product->in_stock,
            'stock_level' => $product->stock_level,
            'brand' => $product->brand,
            'images' => $images,
            ...array_diff_key($pricing, ['price' => true]),
        ];
    }
}
