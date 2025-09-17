<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'title', 'slug', 'status', 'description', 'input_one', 'input_two', 'input_three', 'schema', 'attachment_url',
    ];

    protected $casts = [
        'schema' => 'array',
        'status' => 'string',
    ];

    const STATUS_UNOPENED = 'unopened';
    const STATUS_UNDER_REVIEW = 'under_review';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';

    public static function getStatuses()
    {
        return [
            self::STATUS_UNOPENED,
            self::STATUS_UNDER_REVIEW,
            self::STATUS_IN_PROGRESS,
            self::STATUS_COMPLETED,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


