<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class LoginOtpController extends Controller
{
    private const SESSION_USER_ID = 'login_otp.user_id';

    private const SESSION_REMEMBER = 'login_otp.remember';

    public function create(Request $request): Response|RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/login-otp', [
            'email' => $this->maskEmail((string) $user->email),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(Request $request, LoginOtpService $otpService): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login');
        }

        $validated = $request->validate([
            'code' => ['required', 'digits:6'],
        ]);

        $this->ensureOtpIsNotRateLimited($request, $user);

        $otpService->verify($user, (string) $validated['code']);

        RateLimiter::clear($this->throttleKey($request, $user));

        Auth::login($user, (bool) $request->session()->get(self::SESSION_REMEMBER, false));

        $request->session()->forget([self::SESSION_USER_ID, self::SESSION_REMEMBER]);
        $request->session()->regenerate();

        $user->forceFill(['last_login_at' => now()])->save();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function resend(Request $request, LoginOtpService $otpService): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('login');
        }

        $key = 'login-otp-resend|'.$user->id.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages([
                'code' => 'Please wait before requesting another login code.',
            ]);
        }

        RateLimiter::hit($key, 60);

        try {
            $otpService->issue($user, (bool) $request->session()->get(self::SESSION_REMEMBER, false), $request);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'code' => 'Could not send a new login code right now. Please check the mail settings.',
            ]);
        }

        return back()->with('status', 'A new login code has been sent.');
    }

    public static function setPendingLogin(Request $request, User $user, bool $remember): void
    {
        $request->session()->put(self::SESSION_USER_ID, $user->id);
        $request->session()->put(self::SESSION_REMEMBER, $remember);
    }

    private function pendingUser(Request $request): ?User
    {
        $userId = $request->session()->get(self::SESSION_USER_ID);

        if (! $userId) {
            return null;
        }

        return User::query()->find($userId);
    }

    private function ensureOtpIsNotRateLimited(Request $request, User $user): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey($request, $user), 6)) {
            RateLimiter::hit($this->throttleKey($request, $user), 300);

            return;
        }

        throw ValidationException::withMessages([
            'code' => 'Too many login-code attempts. Please wait a few minutes.',
        ]);
    }

    private function throttleKey(Request $request, User $user): string
    {
        return Str::lower('login-otp|'.$user->id.'|'.$request->ip());
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) {
            return $email;
        }

        [$name, $domain] = explode('@', $email, 2);

        $visible = Str::substr($name, 0, 2);

        return $visible.str_repeat('*', max(2, strlen($name) - 2)).'@'.$domain;
    }
}
