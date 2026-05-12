<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\CurrencyCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CapitalBatch extends Model
{
    use AuditsModelChanges;

    protected $fillable = [
        'usd_amount',
        'funding_date',
        'reference_currency',
        'reference_exchange_rate_to_usd',
        'reference_original_amount',
        'remaining_usd',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'funding_date' => 'date',
            'reference_currency' => CurrencyCode::class,
            'usd_amount' => 'decimal:2',
            'reference_exchange_rate_to_usd' => 'decimal:8',
            'reference_original_amount' => 'decimal:2',
            'remaining_usd' => 'decimal:2',
        ];
    }

    public function exchangeRateSnapshots(): MorphMany
    {
        return $this->morphMany(ExchangeRateSnapshot::class, 'source');
    }
}
