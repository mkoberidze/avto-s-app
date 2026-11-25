<?php

namespace App\Support;

use App\Models\BrandPromotion;
use App\Models\Product;
class BrandPromotions
{
    /**
     * @return array<string, BrandPromotion>
     */
    public static function activeMap(): array
    {
        return BrandPromotion::query()
            ->where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->get()
            ->keyBy('brand')
            ->all();
    }

    /**
     * @param array<string, BrandPromotion>|null $promotions
     * @return array{price: float, original_price?: float, discount_percent?: int, promotion_ends_at?: string}
     */
    public static function pricing(Product $product, ?array $promotions = null): array
    {
        $price = round((float) $product->price, 2);
        $promotions ??= self::activeMap();
        $promotion = $promotions[$product->brand] ?? null;

        if (! $product->isPriced() || ! $promotion || $promotion->ends_at->lte(now())) {
            return ['price' => $price];
        }

        return [
            'price' => round($price * (100 - $promotion->discount_percent) / 100, 2),
            'original_price' => $price,
            'discount_percent' => $promotion->discount_percent,
            'promotion_ends_at' => $promotion->ends_at->toISOString(),
        ];
    }
}
