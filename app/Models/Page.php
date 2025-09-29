<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title_en', 'title_ka',
        'body_en', 'body_ka',
        'sections',
    ];

    protected $casts = [
        'sections' => 'array',
    ];
}


