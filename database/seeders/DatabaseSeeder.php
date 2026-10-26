<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\GeorgianPhone;
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

        $adminPhone = GeorgianPhone::normalize((string) config('admin.phone'));
        $adminPassword = config('admin.password');

        $matches = User::query()->whereIn('phone', GeorgianPhone::variants($adminPhone))->get();
        $admin = $matches->first(fn (User $user) => $user->hasRole('admin')) ?? $matches->first();

        if (! $admin) {
            $admin = User::query()->create([
                'phone' => $adminPhone,
                'name' => 'Administrator',
                'email' => $adminPhone.'@example.local',
                'password' => Hash::make($adminPassword),
            ]);
        } elseif ($admin->phone !== $adminPhone
            && ! User::query()->where('phone', $adminPhone)->whereKeyNot($admin->id)->exists()) {
            $admin->phone = $adminPhone;
            $admin->save();
        }
        if (! $admin->hasRole('admin')) {
            $admin->assignRole($adminRole);
        }
    }
}
