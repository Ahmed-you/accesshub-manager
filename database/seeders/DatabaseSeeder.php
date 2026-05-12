<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate([
            'username' => env('ADMIN_USERNAME', 'admin'),
        ], [
            'name' => env('ADMIN_NAME', 'AccessHub Admin'),
            'email' => env('ADMIN_EMAIL', 'admin@example.com'),
            'password' => env('ADMIN_PASSWORD', 'password'),
            'role' => UserRole::Admin,
        ]);
    }
}
