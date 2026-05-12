<?php

namespace App\Services;

use App\Models\AutomationDelivery;
use Illuminate\Support\Facades\Process;
use Throwable;

class TelegramDeliverySender
{
    /**
     * @return array{processed: int, sent: int, failed: int, skipped: int}
     */
    public function sendQueued(int $limit = 10, ?string $purpose = null): array
    {
        $stats = [
            'processed' => 0,
            'sent' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        $deliveries = AutomationDelivery::query()
            ->where('platform', 'telegram')
            ->where('status', 'queued')
            ->when($purpose, fn ($query) => $query->where('purpose', $purpose))
            ->where(function ($query) {
                $query->whereNull('scheduled_for')->orWhere('scheduled_for', '<=', now());
            })
            ->orderByRaw('scheduled_for IS NOT NULL')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        foreach ($deliveries as $delivery) {
            $stats['processed']++;

            if (! $delivery->target_identifier) {
                $this->markFailed($delivery, 'Missing Telegram target identifier.');
                $stats['failed']++;

                continue;
            }

            if (! trim((string) $delivery->message_body) && ! $delivery->source_message_ref) {
                $this->markFailed($delivery, 'Message body or source message reference is required.');
                $stats['failed']++;

                continue;
            }

            $delivery->forceFill([
                'status' => 'sending',
                'failed_at' => null,
                'error_message' => null,
            ])->save();

            $result = $this->sendDelivery($delivery);

            if ($result['ok'] ?? false) {
                $metadata = $delivery->metadata ?? [];
                $metadata['telegram_result'] = $result;
                $metadata['sent_by'] = 'telegram:send-queued';

                $delivery->forceFill([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'failed_at' => null,
                    'error_message' => null,
                    'metadata' => $metadata,
                ])->save();

                $stats['sent']++;

                continue;
            }

            $this->markFailed($delivery, (string) ($result['error'] ?? 'Telegram send failed.'));
            $stats['failed']++;
        }

        return $stats;
    }

    /**
     * @return array<string, mixed>
     */
    private function sendDelivery(AutomationDelivery $delivery): array
    {
        $script = base_path('scripts/telegram_send_message.py');
        $binary = env('TELEGRAM_PYTHON_BINARY') ?: (PHP_OS_FAMILY === 'Windows' ? 'py' : 'python3');

        try {
            $result = Process::path(base_path())
                ->env($this->pythonEnvironment())
                ->timeout(120)
                ->run([
                    $binary,
                    $script,
                    '--target',
                    $delivery->target_identifier,
                    '--message-body',
                    (string) $delivery->message_body,
                    '--source-message-ref',
                    (string) $delivery->source_message_ref,
                    '--json',
                    '--no-interactive',
                ]);
        } catch (Throwable $exception) {
            return [
                'ok' => false,
                'error' => $exception->getMessage(),
            ];
        }

        $decoded = json_decode(trim($result->output()), true);

        if (is_array($decoded)) {
            return $decoded;
        }

        return [
            'ok' => false,
            'error' => trim($result->errorOutput()) ?: trim($result->output()) ?: 'Telegram send command failed.',
        ];
    }

    /**
     * Windows Python needs the normal OS environment for asyncio/socket startup.
     *
     * @return array<string, string>
     */
    private function pythonEnvironment(): array
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return [];
        }

        $systemRoot = $this->envValue('SystemRoot') ?: $this->envValue('SYSTEMROOT') ?: 'C:\\WINDOWS';
        $path = $this->envValue('Path') ?: $this->envValue('PATH') ?: '';
        $environment = [
            'SystemRoot' => $systemRoot,
            'SYSTEMROOT' => $systemRoot,
            'WINDIR' => $this->envValue('WINDIR') ?: $systemRoot,
            'Path' => $path,
            'PATH' => $path,
        ];

        foreach (['USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP'] as $key) {
            $value = $this->envValue($key);

            if ($value) {
                $environment[$key] = $value;
            }
        }

        return array_filter($environment, fn (string $value): bool => $value !== '');
    }

    private function envValue(string $key): ?string
    {
        $value = getenv($key);

        if (is_string($value) && $value !== '') {
            return $value;
        }

        $serverValue = $_SERVER[$key] ?? null;

        return is_string($serverValue) && $serverValue !== '' ? $serverValue : null;
    }

    private function markFailed(AutomationDelivery $delivery, string $message): void
    {
        $delivery->forceFill([
            'status' => 'failed',
            'failed_at' => now(),
            'error_message' => $message,
        ])->save();
    }
}
