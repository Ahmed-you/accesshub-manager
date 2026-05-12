<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\CurrencyCode;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionDurationUnit;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subscription extends Model
{
    use AuditsModelChanges, SoftDeletes;

    protected $fillable = [
        'internal_order_number',
        'customer_id',
        'service_id',
        'supplier_id',
        'renewed_from_subscription_id',
        'plan_name',
        'account_identifier',
        'account_secret_encrypted',
        'duration_value',
        'duration_unit',
        'duration_days',
        'sale_recorded_at',
        'start_date',
        'end_date',
        'delivered_at',
        'sale_amount_original',
        'sale_currency',
        'sale_exchange_rate_to_usd',
        'sale_amount_usd',
        'cost_usd',
        'profit_usd',
        'status',
        'cancel_reason',
        'refund_reason',
        'notes',
    ];

    protected $hidden = [
        'account_secret_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'duration_value' => 'integer',
            'duration_unit' => SubscriptionDurationUnit::class,
            'duration_days' => 'integer',
            'sale_recorded_at' => 'datetime',
            'start_date' => 'date',
            'end_date' => 'date',
            'delivered_at' => 'datetime',
            'sale_amount_original' => 'decimal:2',
            'sale_currency' => CurrencyCode::class,
            'sale_exchange_rate_to_usd' => 'decimal:8',
            'sale_amount_usd' => 'decimal:4',
            'cost_usd' => 'decimal:4',
            'profit_usd' => 'decimal:4',
            'status' => SubscriptionStatus::class,
            'account_secret_encrypted' => 'encrypted',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function renewedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'renewed_from_subscription_id');
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(self::class, 'renewed_from_subscription_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expiryReminders(): HasMany
    {
        return $this->hasMany(ExpiryReminder::class);
    }

    public function exchangeRateSnapshots(): MorphMany
    {
        return $this->morphMany(ExchangeRateSnapshot::class, 'source');
    }

    public function getPaymentStatusAttribute(): PaymentStatus
    {
        if ($this->status === SubscriptionStatus::Cancelled) {
            return PaymentStatus::Cancelled;
        }

        if ($this->status === SubscriptionStatus::Refunded) {
            return PaymentStatus::Refunded;
        }

        $paidTotal = (float) ($this->getAttribute('payments_sum_amount_usd') ?? $this->payments()->sum('amount_usd'));
        $saleTotal = (float) $this->sale_amount_usd;

        if ($paidTotal <= 0) {
            return PaymentStatus::Unpaid;
        }

        if ($paidTotal < $saleTotal) {
            return PaymentStatus::Partial;
        }

        return PaymentStatus::Paid;
    }
}
