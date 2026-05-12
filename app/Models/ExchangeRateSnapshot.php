<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\CurrencyCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ExchangeRateSnapshot extends Model
{
    use AuditsModelChanges;

    protected $fillable = [
        'source_type',
        'source_id',
        'from_currency',
        'to_currency',
        'rate',
        'captured_at',
        'provider',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'from_currency' => CurrencyCode::class,
            'to_currency' => CurrencyCode::class,
            'rate' => 'decimal:8',
            'captured_at' => 'datetime',
        ];
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
