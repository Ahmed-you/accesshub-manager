<?php

namespace App\Services;

use App\Mail\AdminLoginOtpMail;
use App\Models\LoginOtp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class LoginOtpService
{
    public const EXPIRES_IN_MINUTES = 10;

    public function issue(User $user, bool $remember, Request $request): LoginOtp
    {
        if (! $user->email) {
            throw ValidationException::withMessages([
                'username' => 'This admin account does not have an email address for verification.',
            ]);
        }

        $code = (string) random_int(100000, 999999);

        $user->loginOtps()
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['consumed_at' => now()]);

        $otp = $user->loginOtps()->create([
            'code_hash' => Hash::make($code),
            'remember' => $remember,
            'expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        Mail::to($user->email)->send(new AdminLoginOtpMail($user, $code, self::EXPIRES_IN_MINUTES));

        return $otp;
    }

    public function verify(User $user, string $code): LoginOtp
    {
        $otp = $user->loginOtps()
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'This login code expired. Please request a new code.',
            ]);
        }

        if ($otp->attempts >= 5) {
            $otp->forceFill(['consumed_at' => now()])->save();

            throw ValidationException::withMessages([
                'code' => 'Too many incorrect attempts. Please request a new code.',
            ]);
        }

        $otp->increment('attempts');

        if (! Hash::check($code, $otp->code_hash)) {
            throw ValidationException::withMessages([
                'code' => 'The login code is incorrect.',
            ]);
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        return $otp;
    }
}
