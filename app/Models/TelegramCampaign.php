<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramCampaign extends Model
{
    protected $fillable = [
        'social_channel_id',
        'message_template_id',
        'telegram_target_id',
        'name',
        'schedule_times',
        'daily_limit',
        'active',
        'last_queued_for',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'daily_limit' => 'integer',
            'last_queued_for' => 'date',
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
}
