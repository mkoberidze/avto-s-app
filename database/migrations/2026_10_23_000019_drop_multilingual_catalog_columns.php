<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropColumns('products', ['translations', 'source_hash', 'name_en', 'name_ru']);
        $this->dropColumns('categories', ['translations']);
        $this->dropColumns('orders', ['language']);
        Schema::dropIfExists('translation_cache');
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'translations')) {
                $table->json('translations')->nullable();
            }
            if (! Schema::hasColumn('products', 'source_hash')) {
                $table->string('source_hash', 32)->nullable();
            }
            if (! Schema::hasColumn('products', 'name_en')) {
                $table->string('name_en', 500)->nullable();
            }
            if (! Schema::hasColumn('products', 'name_ru')) {
                $table->string('name_ru', 500)->nullable();
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'translations')) {
                $table->json('translations')->nullable();
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'language')) {
                $table->string('language', 2)->nullable();
            }
        });

        if (! Schema::hasTable('translation_cache')) {
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
    }

    /**
     * @param  list<string>  $columns
     */
    private function dropColumns(string $table, array $columns): void
    {
        $existing = array_values(array_filter($columns, fn (string $column) => Schema::hasColumn($table, $column)));
        if ($existing === []) {
            return;
        }

        $this->dropIndexesForColumns($table, $existing);

        Schema::table($table, function (Blueprint $blueprint) use ($existing) {
            $blueprint->dropColumn($existing);
        });
    }

    /**
     * @param  list<string>  $columns
     */
    private function dropIndexesForColumns(string $table, array $columns): void
    {
        foreach (Schema::getIndexes($table) as $index) {
            $indexColumns = $index['columns'] ?? [];
            if (($index['primary'] ?? false) || array_intersect($indexColumns, $columns) === []) {
                continue;
            }

            $name = $index['name'] ?? null;
            if (! is_string($name) || $name === '') {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($index, $name) {
                if ($index['unique'] ?? false) {
                    $blueprint->dropUnique($name);
                } else {
                    $blueprint->dropIndex($name);
                }
            });
        }
    }
};
