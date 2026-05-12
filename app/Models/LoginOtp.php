<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginOtp extends Model
{
    protected $fillable = [
        'user_id',
        'code_hash',
        'remember',
        'expires_at',
        'consumed_at',
        'attempts',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'remember' => 'boolean',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null
            && $this->expires_at->isFuture()
            && $this->attempts < 5;
    }
}
