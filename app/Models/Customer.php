<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\CurrencyCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use AuditsModelChanges, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'preferred_currency',
        'telegram_username',
        'telegram_chat_id',
        'telegram_notifications_enabled',
        'telegram_opted_in_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'preferred_currency' => CurrencyCode::class,
            'telegram_notifications_enabled' => 'boolean',
            'telegram_opted_in_at' => 'datetime',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
