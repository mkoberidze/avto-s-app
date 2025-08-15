<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'title', 'slug', 'status', 'description', 'input_one', 'input_two', 'input_three', 'schema',
    ];

    protected $casts = [
        'schema' => 'array',
        'status' => 'string',
    ];

    const STATUS_UNOPENED = 'unopened';
    const STATUS_SEEN = 'seen';
    const STATUS_COMPLETED = 'completed';

    public static function getStatuses()
    {
        return [
            self::STATUS_UNOPENED,
            self::STATUS_COMPLETED,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


