<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Models\Service;
use App\Services\SubscriptionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
        ];

        $services = Service::query()
            ->withCount('subscriptions')
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(name) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(category, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [$search]);
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Service $service) => $this->serviceData($service, true));

        return Inertia::render('admin/services/index', [
            'services' => $services,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/services/create', [
            'durationUnits' => $this->durationUnitOptions(),
        ]);
    }

    public function store(ServiceRequest $request, SubscriptionService $subscriptionService): RedirectResponse
    {
        $payload = Arr::except($subscriptionService->prepareServiceDefaults($request->validated()), ['image', 'remove_image']);
        $payload['image_path'] = $this->storeImage($request);

        Service::query()->create($payload);

        return redirect()
            ->route('services.index')
            ->with('success', 'Service created successfully.');
    }

    public function edit(Service $service): Response
    {
        return Inertia::render('admin/services/edit', [
            'service' => $this->serviceData($service),
            'durationUnits' => $this->durationUnitOptions(),
        ]);
    }

    public function update(ServiceRequest $request, Service $service, SubscriptionService $subscriptionService): RedirectResponse
    {
        $payload = Arr::except($subscriptionService->prepareServiceDefaults($request->validated()), ['image', 'remove_image']);

        if ($request->boolean('remove_image')) {
            $this->deleteImage($service->image_path);
            $payload['image_path'] = null;
        }

        $newImagePath = $this->storeImage($request);

        if ($newImagePath !== null) {
            $this->deleteImage($service->image_path);
            $payload['image_path'] = $newImagePath;
        }

        $service->update($payload);

        return redirect()
            ->route('services.index')
            ->with('success', 'Service updated successfully.');
    }

    public function destroy(Service $service): RedirectResponse
    {
        try {
            $service->delete();
        } catch (QueryException) {
            return redirect()
                ->route('services.index')
                ->with('error', 'This service cannot be deleted while related subscriptions still exist.');
        }

        return redirect()
            ->route('services.index')
            ->with('success', 'Service deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function serviceData(Service $service, bool $includeCounts = false): array
    {
        return array_filter([
            'id' => $service->id,
            'name' => $service->name,
            'category' => $service->category,
            'description' => $service->description,
            'default_duration_value' => $service->default_duration_value,
            'default_duration_unit' => $service->default_duration_unit?->value ?? $service->default_duration_unit,
            'default_duration_days' => $service->default_duration_days,
            'active' => $service->active,
            'image_url' => $service->image_path ? $this->publicStorageUrl($service->image_path) : null,
            'subscriptions_count' => $includeCounts ? $service->subscriptions_count : null,
            'created_at' => $service->created_at?->toDateTimeString(),
            'updated_at' => $service->updated_at?->toDateTimeString(),
        ], static fn ($value) => $value !== null);
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function durationUnitOptions(): array
    {
        return [
            ['value' => 'day', 'label' => 'Days'],
            ['value' => 'month', 'label' => 'Months'],
            ['value' => 'year', 'label' => 'Years'],
        ];
    }

    private function storeImage(ServiceRequest $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }

        return $request->file('image')->store('services', 'public');
    }

    private function deleteImage(?string $imagePath): void
    {
        if ($imagePath && Storage::disk('public')->exists($imagePath)) {
            Storage::disk('public')->delete($imagePath);
        }
    }

    private function publicStorageUrl(string $path): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $path), '/');
    }
}
