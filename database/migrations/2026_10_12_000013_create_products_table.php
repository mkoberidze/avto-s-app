<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('product_code')->index();
            $table->unsignedBigInteger('category_id')->nullable()->index();
            $table->string('name_ka');
            $table->longText('short_description_ka')->nullable();
            $table->longText('description_ka')->nullable();
            $table->decimal('price', 10, 2);
            $table->boolean('in_stock')->default(false);
            $table->string('stock_level', 8)->nullable();
            $table->string('brand')->nullable()->index();
            $table->json('features')->nullable();
            $table->json('images')->nullable();
            $table->string('source_hash', 32);
            $table->boolean('in_feed')->default(true);
            $table->timestamp('first_seen_at');
            $table->timestamp('synced_at');
            $table->json('translations')->nullable();
            $table->boolean('is_hidden')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
