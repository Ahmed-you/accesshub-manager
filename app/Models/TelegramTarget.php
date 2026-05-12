<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramTarget extends Model
{
    protected $fillable = [
        'social_channel_id',
        'name',
        'target_type',
        'target_identifier',
        'permission_status',
        'active',
        'posting_hours',
        'daily_limit',
        'last_queued_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'daily_limit' => 'integer',
            'last_queued_at' => 'datetime',
        ];
    }

    public function socialChannel(): BelongsTo
    {
        return $this->belongsTo(SocialChannel::class);
    }

    public function automationDeliveries(): HasMany
    {
        return $this->hasMany(AutomationDelivery::class);
    }
}
