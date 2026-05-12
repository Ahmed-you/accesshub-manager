<?php

namespace App\Models;

use App\Enums\ReminderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpiryReminder extends Model
{
    protected $fillable = [
        'subscription_id',
        'reminder_date',
        'days_before_expiry',
        'status',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'reminder_date' => 'date',
            'days_before_expiry' => 'integer',
            'status' => ReminderStatus::class,
            'sent_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
