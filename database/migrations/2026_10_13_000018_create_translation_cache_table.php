<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('translation_cache', function (Blueprint $table) {
            $table->id();
            $table->char('source_hash', 32);
            $table->string('lang', 2);
            $table->text('source_text');
            $table->text('translated_text');
            $table->timestamps();
            $table->unique(['source_hash', 'lang']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('translation_cache');
    }
};
