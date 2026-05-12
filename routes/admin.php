<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CapitalBatchController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\ExchangeRateSnapshotController;
use App\Http\Controllers\Admin\LatestExchangeRateController;
use App\Http\Controllers\Admin\ReminderController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\TelegramAutomationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])->group(function () {
    Route::resource('customers', CustomerController::class);
    Route::get('customers/{customer}/telegram-search', [CustomerController::class, 'searchTelegram'])->name('customers.telegram-search');
    Route::post('customers/{customer}/telegram-lookup', [CustomerController::class, 'lookupTelegram'])->name('customers.telegram-lookup');
    Route::resource('suppliers', SupplierController::class)->except(['show']);
    Route::resource('services', ServiceController::class)->except(['show']);
    Route::resource('capital-batches', CapitalBatchController::class)->except(['show']);
    Route::post('subscriptions/{subscription}/reveal-secret', [SubscriptionController::class, 'revealSecret'])
        ->name('subscriptions.reveal-secret');
    Route::resource('subscriptions', SubscriptionController::class)->except(['show']);
    Route::resource('payments', PaymentController::class)->except(['show']);
    Route::get('exchange-rates/latest', LatestExchangeRateController::class)->name('exchange-rates.latest');
    Route::post('exchange-rate-snapshots/sync-missing', [ExchangeRateSnapshotController::class, 'syncMissing'])->name('exchange-rate-snapshots.sync-missing');
    Route::resource('exchange-rate-snapshots', ExchangeRateSnapshotController::class)->only(['index', 'create', 'store']);
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reminders', [ReminderController::class, 'index'])->name('reminders.index');
    Route::patch('reminders/{expiryReminder}/handle', [ReminderController::class, 'handle'])->name('reminders.handle');
    Route::patch('reminders/{expiryReminder}/snooze', [ReminderController::class, 'snooze'])->name('reminders.snooze');
    Route::patch('reminders/{expiryReminder}/dismiss', [ReminderController::class, 'dismiss'])->name('reminders.dismiss');
    Route::patch('reminders/{expiryReminder}/reopen', [ReminderController::class, 'reopen'])->name('reminders.reopen');
    Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('automation/telegram', [TelegramAutomationController::class, 'index'])->name('automation.telegram.index');
    Route::post('automation/telegram/targets', [TelegramAutomationController::class, 'storeTarget'])->name('automation.telegram.targets.store');
    Route::put('automation/telegram/targets/{telegramTarget}', [TelegramAutomationController::class, 'updateTarget'])
        ->name('automation.telegram.targets.update');
    Route::delete('automation/telegram/targets/{telegramTarget}', [TelegramAutomationController::class, 'destroyTarget'])
        ->name('automation.telegram.targets.destroy');
    Route::post('automation/telegram/templates', [TelegramAutomationController::class, 'storeTemplate'])->name('automation.telegram.templates.store');
    Route::put('automation/telegram/templates/{messageTemplate}', [TelegramAutomationController::class, 'updateTemplate'])
        ->name('automation.telegram.templates.update');
    Route::delete('automation/telegram/templates/{messageTemplate}', [TelegramAutomationController::class, 'destroyTemplate'])
        ->name('automation.telegram.templates.destroy');
    Route::post('automation/telegram/queue-marketing', [TelegramAutomationController::class, 'queueMarketing'])->name('automation.telegram.queue-marketing');
    Route::post('automation/telegram/campaigns', [TelegramAutomationController::class, 'storeCampaign'])->name('automation.telegram.campaigns.store');
    Route::put('automation/telegram/campaigns/{telegramCampaign}', [TelegramAutomationController::class, 'updateCampaign'])
        ->name('automation.telegram.campaigns.update');
    Route::delete('automation/telegram/campaigns/{telegramCampaign}', [TelegramAutomationController::class, 'destroyCampaign'])
        ->name('automation.telegram.campaigns.destroy');
    Route::delete('automation/telegram/deliveries/{automationDelivery}', [TelegramAutomationController::class, 'destroyDelivery'])
        ->name('automation.telegram.deliveries.destroy');
    Route::post('automation/telegram/queue-direct-message', [TelegramAutomationController::class, 'queueDirectMessage'])
        ->name('automation.telegram.queue-direct-message');
    Route::post('automation/telegram/send-queued', [TelegramAutomationController::class, 'sendQueued'])->name('automation.telegram.send-queued');
    Route::post('automation/telegram/scheduler-tick', [TelegramAutomationController::class, 'schedulerTick'])
        ->name('automation.telegram.scheduler-tick');
    Route::post('automation/telegram/queue-renewal-reminders', [TelegramAutomationController::class, 'queueRenewalReminders'])
        ->name('automation.telegram.queue-renewal-reminders');
});
