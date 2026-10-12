<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('new');
            $table->string('customer_name');
            $table->string('phone');
            $table->text('address');
            $table->text('comment')->nullable();
            $table->string('attachment_url')->nullable();
            $table->decimal('total', 12, 2);
            $table->string('language', 2)->nullable();
            $table->string('client_token', 64)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'client_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
