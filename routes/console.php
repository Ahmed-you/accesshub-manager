<?php

use App\Enums\UserRole;
use App\Http\Controllers\Admin\TelegramAutomationController;
use App\Models\User;
use App\Services\ExpiryReminderService;
use App\Services\TelegramDeliverySender;
use App\Services\TelegramRenewalReminderService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\Console\Command\Command;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('accesshub:create-admin {emailOrUsername} {email?} {--name=} {--password=}', function () {
    $first = (string) $this->argument('emailOrUsername');
    $second = $this->argument('email');
    $email = $second ? (string) $second : $first;
    $username = $second ? $first : Str::of($email)->before('@')->replaceMatches('/[^A-Za-z0-9_]+/', '_')->lower()->trim('_')->toString();
    $name = (string) ($this->option('name') ?: Str::headline($username));
    $providedPassword = $this->option('password');
    $password = $providedPassword ? (string) $providedPassword : Str::random(14).'A1!';
    $existingUser = User::query()
        ->where('email', $email)
        ->orWhere('username', $username)
        ->first();

    $validator = Validator::make([
        'username' => $username,
        'email' => $email,
        'name' => $name,
        'password' => $password,
    ], [
        'username' => ['required', 'string', 'max:255'],
        'email' => [
            'required',
            'email',
            'max:255',
            Rule::unique('users', 'email')->ignore($existingUser?->id),
        ],
        'name' => ['required', 'string', 'max:255'],
        'password' => ['required', 'string', 'min:10'],
    ]);

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return Command::FAILURE;
    }

    $values = [
        'name' => $name,
        'email' => $email,
        'email_verified_at' => now(),
        'role' => UserRole::Admin,
    ];

    if (! $existingUser || $providedPassword) {
        $values['password'] = $password;
    }

    if ($existingUser) {
        $existingUser->forceFill($values)->save();
        $user = $existingUser;
    } else {
        $user = User::query()->create(['username' => $username, ...$values]);
    }

    $this->info($existingUser ? 'Admin user updated.' : 'Admin user created.');
    $this->line("Email: {$user->email}");
    $this->line("Login with email: {$user->email}");

    if (! $providedPassword && ! $existingUser) {
        $this->warn("Temporary password: {$password}");
        $this->warn('You can ignore this and use Forgot password to choose your own password by email OTP.');
    } elseif (! $providedPassword && $existingUser) {
        $this->line('Password unchanged.');
    }

    return Command::SUCCESS;
})->purpose('Create or update an AccessHub admin user');

Artisan::command('reminders:sync', function (ExpiryReminderService $expiryReminderService) {
    $stats = $expiryReminderService->syncAll();

    $this->info("Checked {$stats['checked']} subscription(s).");
    $this->line("Created: {$stats['created']}");
    $this->line("Updated: {$stats['updated']}");
    $this->line("Deleted: {$stats['deleted']}");

    return Command::SUCCESS;
})->purpose('Sync subscription expiry reminders');

Artisan::command('telegram:send-queued {--limit=10 : Maximum queued deliveries to process} {--purpose= : Optional purpose filter: direct_message, renewal_reminder, marketing}', function (TelegramDeliverySender $sender) {
    $limit = max(1, min(50, (int) $this->option('limit')));
    $purpose = $this->option('purpose') ? (string) $this->option('purpose') : null;

    if ($purpose && ! in_array($purpose, ['direct_message', 'renewal_reminder', 'marketing'], true)) {
        $this->error('Invalid purpose. Use direct_message, renewal_reminder, or marketing.');

        return Command::FAILURE;
    }

    $stats = $sender->sendQueued($limit, $purpose);

    $this->info("Processed {$stats['processed']} Telegram delivery/deliveries.");
    $this->line("Sent: {$stats['sent']}");
    $this->line("Failed: {$stats['failed']}");
    $this->line("Skipped: {$stats['skipped']}");

    return $stats['failed'] > 0 ? Command::FAILURE : Command::SUCCESS;
})->purpose('Send queued Telegram automation deliveries');

Artisan::command('telegram:automatic-renewal-reminders {--days=3 : Send reminders for subscriptions ending within this many days} {--limit=50 : Maximum queued renewal reminders to send} {--queue-only : Queue reminders without sending}', function (TelegramRenewalReminderService $reminders, TelegramDeliverySender $sender) {
    $days = max(1, min(30, (int) $this->option('days')));
    $limit = max(1, min(100, (int) $this->option('limit')));

    $queueStats = $reminders->queueDueReminders($days);

    $this->info("Checked {$queueStats['checked']} subscription(s).");
    $this->line("Queued renewal reminders: {$queueStats['queued']}");
    $this->line("Skipped: {$queueStats['skipped']}");

    if ($this->option('queue-only')) {
        return Command::SUCCESS;
    }

    $sendStats = $sender->sendQueued($limit, 'renewal_reminder');

    $this->info("Processed {$sendStats['processed']} queued renewal reminder(s).");
    $this->line("Sent: {$sendStats['sent']}");
    $this->line("Failed: {$sendStats['failed']}");

    return $sendStats['failed'] > 0 ? Command::FAILURE : Command::SUCCESS;
})->purpose('Automatically queue and send Telegram renewal reminders');

Artisan::command('telegram:queue-daily-campaigns', function () {
    $stats = app(TelegramAutomationController::class)->queueDailyCampaigns();

    $this->info("Checked {$stats['checked']} daily Telegram routine(s).");
    $this->line("Queued: {$stats['queued']}");

    return Command::SUCCESS;
})->purpose("Queue today's Telegram campaign deliveries from active daily routines");

Schedule::command('telegram:automatic-renewal-reminders --days=3 --limit=50')
    ->dailyAt('10:00')
    ->withoutOverlapping();

Schedule::command('reminders:sync')
    ->dailyAt('07:00')
    ->withoutOverlapping();

if (env('TELEGRAM_MARKETING_AUTOSEND', false)) {
    $marketingLimit = max(1, min(5, (int) env('TELEGRAM_MARKETING_SEND_LIMIT', 1)));

    Schedule::command('telegram:queue-daily-campaigns')
        ->everyMinute()
        ->withoutOverlapping();

    Schedule::command("telegram:send-queued --purpose=marketing --limit={$marketingLimit}")
        ->everyMinute()
        ->withoutOverlapping();
}
