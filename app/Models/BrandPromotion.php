<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BrandPromotion extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'integer',
            'duration_days' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }
}
