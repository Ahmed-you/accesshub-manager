<?php

namespace App\Services;

use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordResetOtpService
{
    public const EXPIRES_IN_MINUTES = 10;

    public function __construct(private AdminOtpMailer $mailer) {}

    public function issue(User $user, Request $request): PasswordResetOtp
    {
        $code = (string) random_int(100000, 999999);

        $user->passwordResetOtps()
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['consumed_at' => now()]);

        $otp = $user->passwordResetOtps()->create([
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        $this->mailer->sendPasswordResetCode($user, $code, self::EXPIRES_IN_MINUTES);

        return $otp;
    }

    public function verify(User $user, string $code): PasswordResetOtp
    {
        $otp = $user->passwordResetOtps()
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'This password reset code expired. Please request a new code.',
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
                'code' => 'The password reset code is incorrect.',
            ]);
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        return $otp;
    }
}
