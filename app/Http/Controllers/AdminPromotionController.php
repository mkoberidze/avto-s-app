<?php

namespace App\Http\Controllers;

use App\Models\BrandPromotion;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPromotionController extends Controller
{
    private const DURATIONS = [1, 3, 7, 8, 14, 30];

    public function index(): JsonResponse
    {
        $brands = Product::query()
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->orderBy('brand')
            ->pluck('brand')
            ->values();

        return response()->json([
            'brands' => $brands,
            'promotions' => BrandPromotion::query()->orderBy('brand')->get()->map(
                fn (BrandPromotion $promotion) => $this->payload($promotion)
            )->values(),
            'durations' => self::DURATIONS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $brands = Product::query()
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->pluck('brand')
            ->all();

        $data = $request->validate([
            'brand' => ['required', 'string', Rule::in($brands)],
            'discount_percent' => ['required', 'integer', 'min:1', 'max:90'],
            'duration_days' => ['required', 'integer', Rule::in(self::DURATIONS)],
        ]);

        $startsAt = now();
        $promotion = BrandPromotion::query()->updateOrCreate(
            ['brand' => $data['brand']],
            [
                'discount_percent' => $data['discount_percent'],
                'duration_days' => $data['duration_days'],
                'starts_at' => $startsAt,
                'ends_at' => $startsAt->copy()->addDays($data['duration_days']),
                'is_active' => true,
            ]
        );

        return response()->json($this->payload($promotion), 200);
    }

    public function end(int $id): JsonResponse
    {
        $promotion = BrandPromotion::query()->findOrFail($id);
        $promotion->is_active = false;
        $promotion->ends_at = now();
        $promotion->save();

        return response()->json($this->payload($promotion->fresh()));
    }

    private function payload(BrandPromotion $promotion): array
    {
        $active = $promotion->is_active
            && $promotion->starts_at->lte(now())
            && $promotion->ends_at->gt(now());

        return [
            'id' => $promotion->id,
            'brand' => $promotion->brand,
            'discount_percent' => $promotion->discount_percent,
            'duration_days' => $promotion->duration_days,
            'starts_at' => $promotion->starts_at->toISOString(),
            'ends_at' => $promotion->ends_at->toISOString(),
            'is_active' => $active,
        ];
    }
}
