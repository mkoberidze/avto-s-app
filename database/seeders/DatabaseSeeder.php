<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Ensure roles exist
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);

        // Create admin user from config
        $adminPhone = config('admin.phone');
        $adminPassword = config('admin.password');

        $admin = User::query()->firstOrCreate(
            ['phone' => $adminPhone],
            [
                'name' => 'Administrator',
                'email' => $adminPhone.'@example.local',
                'password' => Hash::make($adminPassword),
            ]
        );
        if (! $admin->hasRole('admin')) {
            $admin->assignRole($adminRole);
        }
    }
}
