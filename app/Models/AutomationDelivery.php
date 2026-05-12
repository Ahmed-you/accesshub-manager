<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutomationDelivery extends Model
{
    protected $fillable = [
        'social_channel_id',
        'message_template_id',
        'telegram_target_id',
        'customer_id',
        'subscription_id',
        'expiry_reminder_id',
        'platform',
        'purpose',
        'target_type',
        'target_identifier',
        'message_body',
        'source_message_ref',
        'status',
        'scheduled_for',
        'sent_at',
        'failed_at',
        'error_message',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_for' => 'datetime',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function socialChannel(): BelongsTo
    {
        return $this->belongsTo(SocialChannel::class);
    }

    public function messageTemplate(): BelongsTo
    {
        return $this->belongsTo(MessageTemplate::class);
    }

    public function telegramTarget(): BelongsTo
    {
        return $this->belongsTo(TelegramTarget::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function expiryReminder(): BelongsTo
    {
        return $this->belongsTo(ExpiryReminder::class);
    }
}
