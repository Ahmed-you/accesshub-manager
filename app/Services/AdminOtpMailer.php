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
        if ($this->usesGoogleAppsScript()) {
            $this->sendWithGoogleAppsScript(
                user: $user,
                subject: 'Your AccessHub Manager login code',
                html: view('emails.auth.login-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                    'embedLogo' => false,
                ])->render(),
            );

            return;
        }

        if ($this->usesBrevo()) {
            $this->sendWithBrevo(
                user: $user,
                subject: 'Your AccessHub Manager login code',
                html: view('emails.auth.login-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                    'embedLogo' => false,
                ])->render(),
            );

            return;
        }

        Mail::to($user->email)->send(new AdminLoginOtpMail($user, $code, $expiresInMinutes));
    }

    public function sendPasswordResetCode(User $user, string $code, int $expiresInMinutes): void
    {
        if ($this->usesGoogleAppsScript()) {
            $this->sendWithGoogleAppsScript(
                user: $user,
                subject: 'Reset your AccessHub Manager password',
                html: view('emails.auth.password-reset-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                    'embedLogo' => false,
                ])->render(),
            );

            return;
        }

        if ($this->usesBrevo()) {
            $this->sendWithBrevo(
                user: $user,
                subject: 'Reset your AccessHub Manager password',
                html: view('emails.auth.password-reset-otp', [
                    'user' => $user,
                    'code' => $code,
                    'expiresInMinutes' => $expiresInMinutes,
                    'embedLogo' => false,
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

    private function usesGoogleAppsScript(): bool
    {
        return in_array(strtolower((string) config('services.accesshub_mail.provider')), [
            'google_apps_script',
            'google-apps-script',
            'google_script',
        ], true);
    }

    private function sendWithGoogleAppsScript(User $user, string $subject, string $html): void
    {
        $url = (string) config('services.google_apps_script_mail.url');
        $secret = (string) config('services.google_apps_script_mail.secret');

        if ($url === '') {
            throw new RuntimeException('GOOGLE_APPS_SCRIPT_MAIL_URL is not configured.');
        }

        if ($secret === '') {
            throw new RuntimeException('GOOGLE_APPS_SCRIPT_MAIL_SECRET is not configured.');
        }

        if (! $user->email) {
            throw new RuntimeException('The admin account does not have an email address.');
        }

        $response = Http::timeout(20)->post($url, [
            'secret' => $secret,
            'to' => $user->email,
            'toName' => $user->name ?: $user->email,
            'subject' => $subject,
            'html' => $html,
            'fromName' => (string) config('services.google_apps_script_mail.from_name'),
        ]);

        if ($response->failed()) {
            throw new RuntimeException(
                'Google Apps Script email send failed with HTTP '.$response->status().': '.$response->body(),
            );
        }

        $json = $response->json();

        if (is_array($json) && ($json['ok'] ?? true) === false) {
            throw new RuntimeException(
                'Google Apps Script email send failed: '.(string) ($json['error'] ?? 'Unknown error'),
            );
        }
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
