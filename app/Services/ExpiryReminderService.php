<?php

namespace App\Services;

use App\Enums\ReminderStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Subscription;

class ExpiryReminderService
{
    /**
     * @var list<int>
     */
    private const DEFAULT_THRESHOLDS = [7, 3, 1];

    /**
     * @return array{created: int, updated: int, deleted: int}
     */
    public function syncForSubscription(Subscription $subscription): array
    {
        if ($subscription->trashed() || $this->isReminderDisabled($subscription)) {
            $deleted = $subscription->expiryReminders()->delete();

            return ['created' => 0, 'updated' => 0, 'deleted' => $deleted];
        }

        $thresholds = self::DEFAULT_THRESHOLDS;
        $existingReminders = $subscription->expiryReminders()->get()->keyBy('days_before_expiry');
        $stats = ['created' => 0, 'updated' => 0, 'deleted' => 0];

        foreach ($thresholds as $daysBeforeExpiry) {
            $reminderDate = $subscription->end_date->copy()->subDays($daysBeforeExpiry)->toDateString();
            $existingReminder = $existingReminders->get($daysBeforeExpiry);

            if ($existingReminder) {
                if ($existingReminder->reminder_date?->toDateString() !== $reminderDate) {
                    $existingReminder->update([
                        'reminder_date' => $reminderDate,
                    ]);

                    $stats['updated']++;
                }

                continue;
            }

            $subscription->expiryReminders()->create([
                'reminder_date' => $reminderDate,
                'days_before_expiry' => $daysBeforeExpiry,
                'status' => ReminderStatus::Pending->value,
            ]);

            $stats['created']++;
        }

        $stats['deleted'] += $subscription->expiryReminders()
            ->whereNotIn('days_before_expiry', $thresholds)
            ->delete();

        return $stats;
    }

    /**
     * @return array{checked: int, created: int, updated: int, deleted: int}
     */
    public function syncAll(): array
    {
        $stats = ['checked' => 0, 'created' => 0, 'updated' => 0, 'deleted' => 0];

        Subscription::query()
            ->with('expiryReminders')
            ->chunkById(100, function ($subscriptions) use (&$stats): void {
                foreach ($subscriptions as $subscription) {
                    $subscriptionStats = $this->syncForSubscription($subscription);

                    $stats['checked']++;
                    $stats['created'] += $subscriptionStats['created'];
                    $stats['updated'] += $subscriptionStats['updated'];
                    $stats['deleted'] += $subscriptionStats['deleted'];
                }
            });

        return $stats;
    }

    private function isReminderDisabled(Subscription $subscription): bool
    {
        return in_array($subscription->status, [
            SubscriptionStatus::Cancelled,
            SubscriptionStatus::Refunded,
        ], true);
    }
}
