<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialChannel extends Model
{
    protected $fillable = [
        'platform',
        'name',
        'active',
        'settings',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function messageTemplates(): HasMany
    {
        return $this->hasMany(MessageTemplate::class);
    }

    public function telegramTargets(): HasMany
    {
        return $this->hasMany(TelegramTarget::class);
    }
}
