<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim((string) $request->string('search')),
        ];

        $suppliers = Supplier::query()
            ->withCount('subscriptions')
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = '%'.mb_strtolower($filters['search']).'%';

                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->whereRaw('LOWER(name) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(contact_name, \'\')) LIKE ?', [$search])
                        ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$search]);
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Supplier $supplier) => $this->supplierData($supplier, true));

        return Inertia::render('admin/suppliers/index', [
            'suppliers' => $suppliers,
            'filters' => $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/suppliers/create');
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        Supplier::query()->create($request->validated());

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier created successfully.');
    }

    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('admin/suppliers/edit', [
            'supplier' => $this->supplierData($supplier),
        ]);
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        try {
            $supplier->delete();
        } catch (QueryException) {
            return redirect()
                ->route('suppliers.index')
                ->with('error', 'This supplier cannot be deleted while related subscriptions still exist.');
        }

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'Supplier deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function supplierData(Supplier $supplier, bool $includeCounts = false): array
    {
        return array_filter([
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_name' => $supplier->contact_name,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'website' => $supplier->website,
            'notes' => $supplier->notes,
            'active' => $supplier->active,
            'subscriptions_count' => $includeCounts ? $supplier->subscriptions_count : null,
            'created_at' => $supplier->created_at?->toDateTimeString(),
            'updated_at' => $supplier->updated_at?->toDateTimeString(),
        ], static fn ($value) => $value !== null);
    }
}
