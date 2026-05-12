<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\CurrencyCode;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Payment extends Model
{
    use AuditsModelChanges;

    protected $fillable = [
        'subscription_id',
        'customer_id',
        'amount_original',
        'currency',
        'exchange_rate_to_usd',
        'amount_usd',
        'paid_at',
        'method',
        'reference',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_original' => 'decimal:2',
            'currency' => CurrencyCode::class,
            'exchange_rate_to_usd' => 'decimal:8',
            'amount_usd' => 'decimal:4',
            'paid_at' => 'datetime',
            'method' => PaymentMethod::class,
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function exchangeRateSnapshots(): MorphMany
    {
        return $this->morphMany(ExchangeRateSnapshot::class, 'source');
    }
}
