<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Str;

class AdminUserBootstrapper
{
    /**
     * Create or update every configured admin without overwriting existing passwords.
     */
    public static function ensureAll(): void
    {
        foreach (self::configuredAdmins() as $admin) {
            self::ensureAdmin($admin);
        }
    }

    /**
     * Create a configured admin for this email if it does not already exist.
     */
    public static function ensureForEmail(string $email): ?User
    {
        $normalizedEmail = Str::lower($email);

        foreach (self::configuredAdmins() as $admin) {
            if (Str::lower($admin['email']) === $normalizedEmail) {
                return self::ensureAdmin($admin);
            }
        }

        return null;
    }

    /**
     * @return array<int, array{username: string, name: string, email: string, password: string}>
     */
    private static function configuredAdmins(): array
    {
        $admins = [];

        self::addAdmin($admins, [
            'username' => env('ADMIN_USERNAME', 'admin'),
            'name' => env('ADMIN_NAME', 'AccessHub Admin'),
            'email' => env('ADMIN_EMAIL', 'admin@example.com'),
            'password' => env('ADMIN_PASSWORD', 'password'),
        ]);

        foreach (explode(';', (string) env('ADMIN_USERS', '')) as $entry) {
            $entry = trim($entry);

            if ($entry === '') {
                continue;
            }

            $parts = array_map('trim', explode('|', $entry));

            if (count($parts) < 4) {
                continue;
            }

            self::addAdmin($admins, [
                'username' => $parts[0],
                'name' => $parts[1],
                'email' => $parts[2],
                'password' => $parts[3],
            ]);
        }

        return array_values($admins);
    }

    /**
     * @param array<string, array{username: string, name: string, email: string, password: string}> $admins
     * @param array{username: mixed, name: mixed, email: mixed, password: mixed} $admin
     */
    private static function addAdmin(array &$admins, array $admin): void
    {
        $email = trim((string) $admin['email']);

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $username = trim((string) $admin['username']);

        if ($username === '') {
            $username = Str::of($email)->before('@')->replaceMatches('/[^A-Za-z0-9_]+/', '_')->lower()->trim('_')->toString();
        }

        $admins[Str::lower($email)] = [
            'username' => $username,
            'name' => trim((string) $admin['name']) ?: Str::headline($username),
            'email' => $email,
            'password' => (string) $admin['password'],
        ];
    }

    /**
     * @param array{username: string, name: string, email: string, password: string} $admin
     */
    private static function ensureAdmin(array $admin): User
    {
        $user = User::query()
            ->where('email', $admin['email'])
            ->orWhere('username', $admin['username'])
            ->first();

        $values = [
            'username' => $admin['username'],
            'name' => $admin['name'],
            'email' => $admin['email'],
            'email_verified_at' => now(),
            'role' => UserRole::Admin,
        ];

        if (! $user) {
            $values['password'] = $admin['password'];

            return User::query()->create($values);
        }

        $user->forceFill($values)->save();

        return $user;
    }
}
