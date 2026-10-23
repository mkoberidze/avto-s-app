<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'attachment_path')) {
                $table->string('attachment_path')->nullable();
            }
            if (! Schema::hasColumn('orders', 'attachment_name')) {
                $table->string('attachment_name')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('orders', 'attachment_path')) {
                $drop[] = 'attachment_path';
            }
            if (Schema::hasColumn('orders', 'attachment_name')) {
                $drop[] = 'attachment_name';
            }
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
