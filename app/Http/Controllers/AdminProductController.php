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
                    ->orWhere('brand', 'like', $term)
                    ->orWhere('translations->en->name', 'like', $term)
                    ->orWhere('translations->ru->name', 'like', $term);
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

        $translation = (string) $request->query('translation', '');
        $lang = (string) $request->query('lang', 'en');
        if (in_array($translation, ['missing', 'machine', 'manual'], true) && in_array($lang, ['en', 'ru'], true)) {
            $column = $lang === 'en' ? 'name_en' : 'name_ru';
            if ($translation === 'missing') {
                $query->where(function ($inner) use ($column) {
                    $inner->whereNull($column)->orWhere($column, '');
                });
            } elseif ($translation === 'manual') {
                $query->whereJsonContains("translations->{$lang}->_manual", 'name');
            } else {
                $query->whereNotNull($column)->where($column, '!=', '')
                    ->where(function ($inner) use ($lang) {
                        $inner->whereNull("translations->{$lang}->_manual")
                            ->orWhereJsonDoesntContain("translations->{$lang}->_manual", 'name');
                    });
            }
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

        $extra = array_values(array_diff(array_keys($request->all()), ['is_hidden', 'is_featured', 'translations']));
        if ($extra !== []) {
            return response()->json([
                'message' => 'Only is_hidden, is_featured and translations can be updated.',
                'fields' => $extra,
            ], 422);
        }

        $data = $request->validate([
            'is_hidden' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'translations' => ['sometimes', 'array'],
            'translations.en' => ['sometimes', 'array'],
            'translations.ru' => ['sometimes', 'array'],
            'translations.en.name' => ['sometimes', 'nullable', 'string', 'max:500'],
            'translations.en.short_description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'translations.en.description' => ['sometimes', 'nullable', 'string', 'max:100000'],
            'translations.ru.name' => ['sometimes', 'nullable', 'string', 'max:500'],
            'translations.ru.short_description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'translations.ru.description' => ['sometimes', 'nullable', 'string', 'max:100000'],
            'translations.en.features' => ['sometimes', 'nullable', 'array'],
            'translations.ru.features' => ['sometimes', 'nullable', 'array'],
        ]);

        if (array_key_exists('is_hidden', $data)) {
            $product->is_hidden = $data['is_hidden'];
        }
        if (array_key_exists('is_featured', $data)) {
            $product->is_featured = $data['is_featured'];
        }
        if (array_key_exists('translations', $data)) {
            $product->translations = $this->mergeTranslations($product, $data['translations']);
        }

        $product->save();

        return response()->json($this->detail($product->fresh()));
    }

    private function mergeTranslations(Product $product, array $incoming): array
    {
        $current = $product->translations ?? [];
        foreach (['en', 'ru'] as $language) {
            if (! isset($incoming[$language]) || ! is_array($incoming[$language])) {
                continue;
            }
            $manual = $current[$language]['_manual'] ?? [];
            if (! is_array($manual)) {
                $manual = [];
            }
            foreach (['name', 'short_description', 'description', 'features'] as $key) {
                if (! array_key_exists($key, $incoming[$language])) {
                    continue;
                }
                $value = $incoming[$language][$key];
                $previous = $current[$language][$key] ?? null;
                $current[$language][$key] = $value;
                $empty = $value === null || $value === '' || $value === [];
                $changed = json_encode($value) !== json_encode($previous);
                $wasManual = in_array($key, $manual, true);
                $manual = array_values(array_filter($manual, fn ($field) => $field !== $key));
                if (! $empty && ($changed || $wasManual)) {
                    $manual[] = $key;
                }
                if ($key === 'name') {
                    $column = $language === 'en' ? 'name_en' : 'name_ru';
                    $product->{$column} = ! $empty && is_string($value) ? $value : null;
                }
            }
            $current[$language]['_manual'] = array_values(array_unique($manual));
        }

        return $current;
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
            'has_en' => $this->hasName($product->translations, 'en'),
            'has_ru' => $this->hasName($product->translations, 'ru'),
            'translation_en' => $product->translationState('en'),
            'translation_ru' => $product->translationState('ru'),
        ];
    }

    private function detail(Product $product): array
    {
        return array_merge($this->listItem($product), [
            'short_description_ka' => $product->short_description_ka,
            'description_ka' => $product->description_ka,
            'features' => (object) (is_array($product->features) ? $product->features : []),
            'images' => array_values($product->images ?? []),
            'translations' => (object) ($product->translations ?? []),
        ]);
    }

    private function hasName(?array $translations, string $language): bool
    {
        $name = data_get($translations, "{$language}.name");

        return is_string($name) && trim($name) !== '';
    }
}
