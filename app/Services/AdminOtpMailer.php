<?php

namespace App\Services;

use App\Mail\AdminLoginOtpMail;
use App\Mail\AdminPasswordResetOtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class AdminOtpMailer
{
    public function sendLoginCode(User $user, string $code, int $expiresInMinutes): void
    {
        if ($this->usesBrevo()) {
            $this->sendWithBrevo(
                user: $user,
                subject: 'Your AccessHub Manager login code',
                html: view('emails.auth.login-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                ])->render(),
            );

            return;
        }

        Mail::to($user->email)->send(new AdminLoginOtpMail($user, $code, $expiresInMinutes));
    }

    public function sendPasswordResetCode(User $user, string $code, int $expiresInMinutes): void
    {
        if ($this->usesBrevo()) {
            $this->sendWithBrevo(
                user: $user,
                subject: 'Reset your AccessHub Manager password',
                html: view('emails.auth.password-reset-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                ])->render(),
            );

            return;
        }

        Mail::to($user->email)->send(new AdminPasswordResetOtpMail($user, $code, $expiresInMinutes));
    }

    private function usesBrevo(): bool
    {
        return strtolower((string) config('services.accesshub_mail.provider')) === 'brevo';
    }

    private function sendWithBrevo(User $user, string $subject, string $html): void
    {
        $apiKey = (string) config('services.brevo.key');

        if ($apiKey === '') {
            throw new RuntimeException('BREVO_API_KEY is not configured.');
        }

        if (! $user->email) {
            throw new RuntimeException('The admin account does not have an email address.');
        }

        $response = Http::timeout(15)
            ->withHeaders([
                'accept' => 'application/json',
                'api-key' => $apiKey,
                'content-type' => 'application/json',
            ])
            ->post('https://api.brevo.com/v3/smtp/email', [
                'sender' => [
                    'name' => (string) config('services.brevo.from_name'),
                    'email' => (string) config('services.brevo.from_address'),
                ],
                'to' => [[
                    'email' => $user->email,
                    'name' => $user->name ?: $user->email,
                ]],
                'subject' => $subject,
                'htmlContent' => $html,
            ]);

        if ($response->failed()) {
            throw new RuntimeException(
                'Brevo email send failed with HTTP '.$response->status().': '.$response->body(),
            );
        }
    }
}
