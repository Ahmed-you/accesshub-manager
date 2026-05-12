<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PasswordResetLinkController extends Controller
{
    public const SESSION_USER_ID = 'password_reset_otp.user_id';

    /**
     * Show the password reset request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Send a password reset OTP to the admin email address.
     *
     * @throws ValidationException
     */
    public function store(Request $request, PasswordResetOtpService $otpService): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = (string) $validated['email'];
        $key = 'password-reset-otp|'.Str::lower($email).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages([
                'email' => 'Please wait before requesting another reset code.',
            ]);
        }

        RateLimiter::hit($key, 60);

        $user = User::query()
            ->where('email', $email)
            ->where('role', UserRole::Admin)
            ->first();

        if (! $user) {
            return back()->with('status', __('If that admin email exists, a reset code will be sent.'));
        }

        try {
            $otpService->issue($user, $request);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'email' => 'Could not send the password reset code right now. Please check mail settings.',
            ]);
        }

        $request->session()->put(self::SESSION_USER_ID, $user->id);

        return redirect()->route('password.reset')
            ->with('status', __('We sent a password reset code to your email.'));
    }
}
