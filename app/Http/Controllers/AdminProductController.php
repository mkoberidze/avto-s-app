<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 25)));

        $query = Product::query();

        if ($request->filled('category_id')) {
            $query->whereIn('category_id', Category::descendantIds((int) $request->query('category_id')));
        }

        if ($request->filled('q')) {
            $term = '%'.$request->query('q').'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('name_ka', 'like', $term)
                    ->orWhere('product_code', 'like', $term)
                    ->orWhere('brand', 'like', $term);
            });
        }

        if ($request->filled('brand')) {
            $query->where('brand', $request->query('brand'));
        }

        $status = (string) $request->query('status', 'all');
        match ($status) {
            'visible' => $query->where('in_feed', true)->where('is_hidden', false),
            'hidden' => $query->where('is_hidden', true),
            'gone' => $query->where('in_feed', false),
            default => null,
        };

        if ($request->has('featured') && $request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        match ((string) $request->query('sort', 'newest')) {
            'priceAsc' => $query->orderBy('price')->orderBy('id'),
            'priceDesc' => $query->orderByDesc('price')->orderBy('id'),
            'name' => $query->orderBy('name_ka')->orderBy('id'),
            default => $query->orderByDesc('first_seen_at')->orderByDesc('id'),
        };

        $total = (clone $query)->count();
        $products = $query->forPage($page, $perPage)->get();

        return response()->json([
            'products' => $products->map(fn (Product $product) => $this->listItem($product))->values(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $product = Product::query()->find($id);
        if (! $product) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($this->detail($product));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::query()->find($id);
        if (! $product) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $extra = array_values(array_diff(array_keys($request->all()), ['is_hidden', 'is_featured']));
        if ($extra !== []) {
            return response()->json([
                'message' => 'Only is_hidden and is_featured can be updated.',
                'fields' => $extra,
            ], 422);
        }

        $data = $request->validate([
            'is_hidden' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('is_hidden', $data)) {
            $product->is_hidden = $data['is_hidden'];
        }
        if (array_key_exists('is_featured', $data)) {
            $product->is_featured = $data['is_featured'];
        }

        $product->save();

        return response()->json($this->detail($product->fresh()));
    }

    private function listItem(Product $product): array
    {
        $images = array_values($product->images ?? []);

        return [
            'id' => (string) $product->id,
            'product_code' => $product->product_code,
            'name_ka' => $product->name_ka,
            'brand' => $product->brand,
            'category_id' => $product->category_id === null ? null : (string) $product->category_id,
            'price' => (float) $product->price,
            'in_stock' => (bool) $product->in_stock,
            'stock_level' => $product->stock_level,
            'in_feed' => (bool) $product->in_feed,
            'is_hidden' => (bool) $product->is_hidden,
            'is_featured' => (bool) $product->is_featured,
            'image' => $images[0] ?? null,
        ];
    }

    private function detail(Product $product): array
    {
        return array_merge($this->listItem($product), [
            'short_description_ka' => $product->short_description_ka,
            'description_ka' => $product->description_ka,
            'features' => (object) (is_array($product->features) ? $product->features : []),
            'images' => array_values($product->images ?? []),
        ]);
    }
}
