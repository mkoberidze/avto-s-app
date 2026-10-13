<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $directCounts = Product::query()
            ->selectRaw('category_id, count(*) as aggregate')
            ->groupBy('category_id')
            ->pluck('aggregate', 'category_id');

        $descendantMap = Category::descendantIdMap();

        $categories = Category::query()
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
                'name_ka' => $category->name_ka,
                'translations' => (object) ($category->translations ?? []),
                'nav_order' => $category->nav_order,
                'is_hidden' => (bool) $category->is_hidden,
                'product_count' => $total,
            ];
        })->values();

        return response()->json($payload);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::query()->find($id);
        if (! $category) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $extra = array_values(array_diff(array_keys($request->all()), ['is_hidden', 'nav_order', 'translations']));
        if ($extra !== []) {
            return response()->json([
                'message' => 'Only is_hidden, nav_order and translations can be updated.',
                'fields' => $extra,
            ], 422);
        }

        $data = $request->validate([
            'is_hidden' => ['sometimes', 'boolean'],
            'nav_order' => ['sometimes', 'nullable', 'integer'],
            'translations' => ['sometimes', 'array'],
            'translations.en' => ['sometimes', 'array'],
            'translations.ru' => ['sometimes', 'array'],
            'translations.en.name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'translations.ru.name' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('is_hidden', $data)) {
            $category->is_hidden = $data['is_hidden'];
        }
        if (array_key_exists('nav_order', $data)) {
            $category->nav_order = $data['nav_order'];
        }
        if (array_key_exists('translations', $data)) {
            $current = $category->translations ?? [];
            foreach (['en', 'ru'] as $language) {
                if (! isset($data['translations'][$language]) || ! is_array($data['translations'][$language])) {
                    continue;
                }
                if (array_key_exists('name', $data['translations'][$language])) {
                    $value = $data['translations'][$language]['name'];
                    $current[$language]['name'] = $value;
                    $manual = $current[$language]['_manual'] ?? [];
                    if (! is_array($manual)) {
                        $manual = [];
                    }
                    $manual = array_values(array_filter($manual, fn ($field) => $field !== 'name'));
                    if (is_string($value) && trim($value) !== '') {
                        $manual[] = 'name';
                    }
                    $current[$language]['_manual'] = array_values(array_unique($manual));
                }
            }
            $category->translations = $current;
        }

        $category->save();

        $fresh = $category->fresh();

        return response()->json([
            'id' => (string) $fresh->id,
            'parent_id' => $fresh->parent_id === null ? null : (string) $fresh->parent_id,
            'name_ka' => $fresh->name_ka,
            'translations' => (object) ($fresh->translations ?? []),
            'nav_order' => $fresh->nav_order,
            'is_hidden' => (bool) $fresh->is_hidden,
        ]);
    }
}
