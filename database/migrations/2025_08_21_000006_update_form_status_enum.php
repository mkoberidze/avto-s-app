<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        // Migrate existing "seen" records to the new "under_review" status first
        try {
            DB::table('forms')->where('status', 'seen')->update(['status' => 'under_review']);
        } catch (\Throwable $e) {
            // Ignore if the update fails before the enum change; we'll retry after
        }

        if ($driver === 'mysql') {
            // Expand ENUM values to the new set
            DB::statement("ALTER TABLE forms MODIFY COLUMN status ENUM('unopened','under_review','in_progress','completed') NOT NULL DEFAULT 'unopened'");
            // Ensure any remaining 'seen' are updated
            DB::table('forms')->where('status', 'seen')->update(['status' => 'under_review']);
        } elseif ($driver === 'pgsql') {
            // Postgres enum alteration is more involved; attempt a simple in-place update if using TEXT or CHECK
            try {
                DB::table('forms')->where('status', 'seen')->update(['status' => 'under_review']);
            } catch (\Throwable $e) {
                // You may need a manual migration for Postgres enum types
            }
        } else {
            // SQLite or others: enum is represented as TEXT; just ensure values are migrated
            DB::table('forms')->where('status', 'seen')->update(['status' => 'under_review']);
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        // Revert statuses to the closest previous value
        DB::table('forms')->whereIn('status', ['under_review', 'in_progress'])->update(['status' => 'unopened']);

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE forms MODIFY COLUMN status ENUM('unopened','seen','completed') NOT NULL DEFAULT 'unopened'");
        } elseif ($driver === 'pgsql') {
            // No-op for simplicity
        }
    }
};


