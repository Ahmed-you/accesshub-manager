<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
            'event' => (string) $request->string('event'),
            'auditable_type' => (string) $request->string('auditable_type'),
        ];

        $logs = AuditLog::query()
            ->with('user')
            ->when($filters['search'] !== '', function ($query) use ($filters): void {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->whereRaw('LOWER(event) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(auditable_type) LIKE ?', [$search])
                        ->orWhereRaw('CAST(auditable_id AS TEXT) LIKE ?', [$search])
                        ->orWhereHas('user', function ($userQuery) use ($search): void {
                            $userQuery
                                ->whereRaw('LOWER(name) LIKE ?', [$search])
                                ->orWhereRaw('LOWER(username) LIKE ?', [$search]);
                        });
                });
            })
            ->when($filters['event'] !== '', fn ($query) => $query->where('event', $filters['event']))
            ->when($filters['auditable_type'] !== '', fn ($query) => $query->where('auditable_type', $filters['auditable_type']))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (AuditLog $auditLog) => $this->auditLogData($auditLog));

        return Inertia::render('admin/audit-logs/index', [
            'auditLogs' => $logs,
            'filters' => $filters,
            'events' => $this->eventOptions(),
            'auditableTypes' => $this->auditableTypeOptions(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function auditLogData(AuditLog $auditLog): array
    {
        $event = $auditLog->event instanceof AuditEvent ? $auditLog->event->value : (string) $auditLog->event;
        $oldValues = $this->safeValues($auditLog->old_values);
        $newValues = $this->safeValues($auditLog->new_values);
        $changedFields = array_values(array_unique(array_merge(
            array_keys($oldValues),
            array_keys($newValues),
        )));

        return [
            'id' => $auditLog->id,
            'event' => $event,
            'event_label' => $this->eventLabel($event),
            'user_name' => $auditLog->user?->name,
            'user_username' => $auditLog->user?->username,
            'auditable_type' => $auditLog->auditable_type,
            'auditable_label' => $this->auditableLabel($auditLog->auditable_type),
            'auditable_id' => $auditLog->auditable_id,
            'changed_fields' => $changedFields,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $auditLog->ip_address,
            'created_at' => $auditLog->created_at?->toDateTimeString(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function eventOptions(): array
    {
        return array_map(
            fn (AuditEvent $event) => ['value' => $event->value, 'label' => $this->eventLabel($event->value)],
            AuditEvent::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function auditableTypeOptions(): array
    {
        return AuditLog::query()
            ->select('auditable_type')
            ->whereNotNull('auditable_type')
            ->distinct()
            ->orderBy('auditable_type')
            ->pluck('auditable_type')
            ->map(fn (string $type): array => [
                'value' => $type,
                'label' => $this->auditableLabel($type),
            ])
            ->values()
            ->all();
    }

    private function eventLabel(string $event): string
    {
        return ucwords(str_replace('_', ' ', $event));
    }

    private function auditableLabel(?string $type): string
    {
        if (! $type) {
            return 'System';
        }

        return Str::headline(class_basename($type));
    }

    /**
     * @param  array<string, mixed>|null  $values
     * @return array<string, mixed>
     */
    private function safeValues(?array $values): array
    {
        return Arr::except($values ?? [], [
            'password',
            'remember_token',
            'account_secret_encrypted',
        ]);
    }
}
