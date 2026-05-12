<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PasswordResetOtpService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Show the password reset OTP page.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('password.request');
        }

        return Inertia::render('auth/reset-password', [
            'email' => $this->maskEmail((string) $user->email),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Reset the password after OTP verification.
     *
     * @throws ValidationException
     */
    public function store(Request $request, PasswordResetOtpService $otpService): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('password.request');
        }

        $request->validate([
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $otpService->verify($user, (string) $request->input('code'));

        $user->forceFill([
            'password' => Hash::make((string) $request->input('password')),
            'remember_token' => Str::random(60),
        ])->save();

        event(new PasswordReset($user));

        $request->session()->forget(PasswordResetLinkController::SESSION_USER_ID);

        return to_route('login')->with('status', __('Password reset successfully. Please log in with your new password.'));
    }

    public function resend(Request $request, PasswordResetOtpService $otpService): RedirectResponse
    {
        $user = $this->pendingUser($request);

        if (! $user) {
            return redirect()->route('password.request');
        }

        $otpService->issue($user, $request);

        return back()->with('status', __('A new password reset code has been sent.'));
    }

    private function pendingUser(Request $request): ?User
    {
        $userId = $request->session()->get(PasswordResetLinkController::SESSION_USER_ID);

        if (! $userId) {
            return null;
        }

        return User::query()->find($userId);
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) {
            return $email;
        }

        [$name, $domain] = explode('@', $email, 2);

        return Str::substr($name, 0, 2).str_repeat('*', max(2, strlen($name) - 2)).'@'.$domain;
    }
}
