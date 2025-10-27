<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('subtitle_en')->nullable()->after('title_ka');
            $table->string('subtitle_ka')->nullable()->after('subtitle_en');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn(['subtitle_en', 'subtitle_ka']);
        });
    }
};


