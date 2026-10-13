<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
        ];
    }

    public static function money(mixed $value): float
    {
        return round((float) $value, 2);
    }

    protected function number(): Attribute
    {
        return Attribute::get(fn () => 'SO-'.str_pad((string) $this->id, 5, '0', STR_PAD_LEFT));
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
