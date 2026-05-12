<?php

namespace App\Concerns;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;

trait AuditsModelChanges
{
    /**
     * @var array<int, array{old: ?array<string, mixed>, new: ?array<string, mixed>}>
     */
    protected static array $auditSnapshots = [];

    protected static function bootAuditsModelChanges(): void
    {
        static::created(function (Model $model): void {
            $model->writeAuditLog(AuditEvent::Created, null, $model->sanitizeAuditAttributes($model->getAttributes()));
        });

        static::updating(function (Model $model): void {
            $dirty = $model->getDirty();

            if ($dirty === []) {
                return;
            }

            static::$auditSnapshots[spl_object_id($model)] = [
                'old' => $model->sanitizeAuditAttributes(Arr::only($model->getOriginal(), array_keys($dirty))),
                'new' => $model->sanitizeAuditAttributes($dirty),
            ];
        });

        static::updated(function (Model $model): void {
            $snapshot = static::$auditSnapshots[spl_object_id($model)] ?? null;

            unset(static::$auditSnapshots[spl_object_id($model)]);

            if ($snapshot === null) {
                return;
            }

            $model->writeAuditLog(AuditEvent::Updated, $snapshot['old'], $snapshot['new']);
        });

        static::deleting(function (Model $model): void {
            static::$auditSnapshots[spl_object_id($model)] = [
                'old' => $model->sanitizeAuditAttributes($model->getOriginal()),
                'new' => null,
            ];
        });

        static::deleted(function (Model $model): void {
            $snapshot = static::$auditSnapshots[spl_object_id($model)] ?? null;

            unset(static::$auditSnapshots[spl_object_id($model)]);

            if ($snapshot === null) {
                return;
            }

            $model->writeAuditLog(AuditEvent::Deleted, $snapshot['old'], null);
        });
    }

    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    protected function writeAuditLog(AuditEvent $event, ?array $oldValues, ?array $newValues): void
    {
        if (! app()->bound('request') || ! Auth::check()) {
            return;
        }

        AuditLog::query()->create([
            'user_id' => Auth::id(),
            'auditable_type' => $this->getMorphClass(),
            'auditable_id' => $this->getKey(),
            'event' => $event,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    protected function sanitizeAuditAttributes(array $attributes): array
    {
        return Arr::except($attributes, [
            'password',
            'remember_token',
            'account_secret_encrypted',
        ]);
    }
}
