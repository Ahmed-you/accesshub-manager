<?php

namespace App\Services;

use App\Enums\SubscriptionStatus;
use App\Models\AutomationDelivery;
use App\Models\Customer;
use App\Models\SocialChannel;
use App\Models\Subscription;
use Illuminate\Support\Collection;

class TelegramRenewalReminderService
{
    /**
     * @return array{checked: int, queued: int, skipped: int}
     */
    public function queueDueReminders(int $daysWindow = 3): array
    {
        $stats = [
            'checked' => 0,
            'queued' => 0,
            'skipped' => 0,
        ];
        $from = now()->startOfDay();
        $to = now()->addDays($daysWindow)->endOfDay();

        $subscriptions = Subscription::query()
            ->with(['customer', 'service'])
            ->whereNotIn('status', [SubscriptionStatus::Cancelled->value, SubscriptionStatus::Refunded->value])
            ->whereBetween('end_date', [$from->toDateString(), $to->toDateString()])
            ->whereHas('customer', function ($query) {
                $query->where('telegram_notifications_enabled', true)
                    ->where(function ($customerQuery) {
                        $customerQuery->whereNotNull('telegram_chat_id')->orWhereNotNull('telegram_username');
                    });
            })
            ->orderBy('end_date')
            ->get();

        /** @var Collection<int, Subscription> $subscriptions */
        foreach ($subscriptions as $subscription) {
            $stats['checked']++;

            if ($this->alreadyReminded($subscription)) {
                $stats['skipped']++;

                continue;
            }

            $customer = $subscription->customer;
            $targetIdentifier = $this->targetIdentifier($customer);

            if (! $customer || ! $targetIdentifier) {
                $stats['skipped']++;

                continue;
            }

            AutomationDelivery::query()->create([
                'social_channel_id' => $this->telegramChannel()->id,
                'customer_id' => $customer->id,
                'subscription_id' => $subscription->id,
                'platform' => 'telegram',
                'purpose' => 'renewal_reminder',
                'target_type' => 'customer',
                'target_identifier' => $targetIdentifier,
                'message_body' => $this->messageBody($subscription),
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => [
                    'queued_from' => 'automatic_renewal_reminder',
                    'days_window' => $daysWindow,
                    'days_remaining' => $this->daysRemaining($subscription),
                    'end_date' => $subscription->end_date?->toDateString(),
                ],
            ]);

            $stats['queued']++;
        }

        return $stats;
    }

    private function alreadyReminded(Subscription $subscription): bool
    {
        return AutomationDelivery::query()
            ->where('platform', 'telegram')
            ->where('purpose', 'renewal_reminder')
            ->where('subscription_id', $subscription->id)
            ->whereIn('status', ['queued', 'sending', 'sent'])
            ->exists();
    }

    private function targetIdentifier(?Customer $customer): ?string
    {
        if (! $customer) {
            return null;
        }

        return $customer->telegram_chat_id ?: $customer->telegram_username;
    }

    private function messageBody(Subscription $subscription): string
    {
        $customerName = $subscription->customer?->name ?? 'Customer';
        $serviceName = $subscription->service?->name ?? 'your service';
        $planName = $subscription->plan_name;
        $endDate = $subscription->end_date?->format('Y-m-d') ?? '';
        $daysRemaining = $this->daysRemaining($subscription);
        $daysLabel = $daysRemaining === 1 ? 'day' : 'days';

        return trim(implode("\n", [
            "Hello {$customerName},",
            "Your {$serviceName} subscription".($planName ? " ({$planName})" : '')." is about to end.",
            "End date: {$endDate}",
            "Time left: {$daysRemaining} {$daysLabel}",
            'Do you want to renew it? Reply to this message and we will help you renew before it expires.',
            'AccessHub',
        ]));
    }

    private function daysRemaining(Subscription $subscription): int
    {
        return now()->startOfDay()->diffInDays($subscription->end_date?->startOfDay() ?? now()->startOfDay(), false);
    }

    private function telegramChannel(): SocialChannel
    {
        return SocialChannel::query()->firstOrCreate(
            ['platform' => 'telegram', 'name' => 'Telegram'],
            ['active' => true, 'settings' => ['provider' => 'telethon_bridge']],
        );
    }
}
