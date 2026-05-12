<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessageTemplate extends Model
{
    protected $fillable = [
        'social_channel_id',
        'name',
        'purpose',
        'body',
        'source_message_ref',
        'active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
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
