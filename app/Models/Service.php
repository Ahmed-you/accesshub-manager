<?php

namespace App\Models;

use App\Concerns\AuditsModelChanges;
use App\Enums\SubscriptionDurationUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use AuditsModelChanges, SoftDeletes;

    protected $fillable = [
        'name',
        'category',
        'description',
        'default_duration_value',
        'default_duration_unit',
        'default_duration_days',
        'active',
        'image_path',
    ];

    protected function casts(): array
    {
        return [
            'default_duration_value' => 'integer',
            'default_duration_unit' => SubscriptionDurationUnit::class,
            'default_duration_days' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
