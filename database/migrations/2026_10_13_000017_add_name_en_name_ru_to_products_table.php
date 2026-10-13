<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('name_en', 500)->nullable()->index();
            $table->string('name_ru', 500)->nullable()->index();
        });

        Product::query()->orderBy('id')->chunkById(100, function ($products) {
            foreach ($products as $product) {
                $en = data_get($product->translations, 'en.name');
                $ru = data_get($product->translations, 'ru.name');
                $dirty = false;
                if (is_string($en) && $en !== '') {
                    $product->name_en = $en;
                    $dirty = true;
                }
                if (is_string($ru) && $ru !== '') {
                    $product->name_ru = $ru;
                    $dirty = true;
                }
                if ($dirty) {
                    $product->save();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'name_ru']);
        });
    }
};
