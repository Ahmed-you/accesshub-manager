<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\LoginOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

     /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request, LoginOtpService $otpService): RedirectResponse
    {
        $user = $request->authenticate();

        if ($user->email) {
            LoginOtpController::setPendingLogin($request, $user, $request->boolean('remember'));

            try {
                $otpService->issue($user, $request->boolean('remember'), $request);
            } catch (Throwable $exception) {
                report($exception);

                throw ValidationException::withMessages([
                    'email' => 'Password is correct, but AccessHub could not send the email code. Please check mail settings.',
                ]);
            }

            return redirect()->route('login.otp')
                ->with('status', 'We sent a login code to your admin email.');
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
