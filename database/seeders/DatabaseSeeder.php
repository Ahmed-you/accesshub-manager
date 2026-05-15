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
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $username = env('ADMIN_USERNAME', 'admin');
        $password = env('ADMIN_PASSWORD', 'password');

        $user = User::query()
            ->where('email', $email)
            ->orWhere('username', $username)
            ->first();

        $values = [
            'username' => $username,
            'name' => env('ADMIN_NAME', 'AccessHub Admin'),
            'email' => $email,
            'email_verified_at' => now(),
            'role' => UserRole::Admin,
        ];

        if (! $user) {
            $values['password'] = $password;
        }

        User::query()->updateOrCreate([
            'email' => $email,
        ], $values);
    }
}
