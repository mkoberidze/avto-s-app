<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_promotions', function (Blueprint $table) {
            $table->id();
            $table->string('brand')->unique();
            $table->unsignedTinyInteger('discount_percent');
            $table->unsignedTinyInteger('duration_days');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_promotions');
    }
};
