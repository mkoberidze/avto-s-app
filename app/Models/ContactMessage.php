<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'message',
        'handled',
        'ip',
    ];

    protected function casts(): array
    {
        return [
            'handled' => 'boolean',
        ];
    }
}
