<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ServesOrderAttachments;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminOrderController extends Controller
{
    use ServesOrderAttachments;

    private const STATUSES = ['new', 'under_review', 'in_progress', 'completed'];

    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 25)));

        $base = Order::query();
        $this->applySearch($base, $request);
        $this->applyDates($base, $request);

        $counts = [];
        foreach (self::STATUSES as $status) {
            $counts[$status] = (clone $base)->where('status', $status)->count();
        }

        $filtered = clone $base;
        if ($request->filled('status')) {
            $status = (string) $request->query('status');
            if (! in_array($status, self::STATUSES, true)) {
                return response()->json(['message' => 'The given data was invalid.', 'errors' => ['status' => ['invalid']]], 422);
            }
            $filtered->where('status', $status);
        }

        $total = (clone $filtered)->count();
        $orders = $filtered->withCount('items')->latest('id')->forPage($page, $perPage)->get();

        return response()->json([
            'orders' => $orders->map(fn (Order $order) => $this->listPayload($order))->values(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'counts' => $counts,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $order = Order::query()->with(['items', 'user'])->withCount('items')->find($id);
        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($this->detailPayload($order));
    }

    public function attachment(int $id)
    {
        $order = Order::query()->find($id);
        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return $this->streamOrderAttachment($order);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $request->exists('status') && ! $request->exists('admin_note')) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['status' => ['At least one of status or admin_note is required.']],
            ], 422);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'in:'.implode(',', self::STATUSES)],
            'admin_note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $order = Order::query()->with(['items', 'user'])->withCount('items')->find($id);
        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if (array_key_exists('status', $data)) {
            $order->status = $data['status'];
        }
        if (array_key_exists('admin_note', $data)) {
            $note = $data['admin_note'];
            $order->admin_note = is_string($note) && trim($note) === '' ? null : $note;
        }
        $order->save();

        return response()->json($this->detailPayload($order->fresh(['items', 'user'])->loadCount('items')));
    }

    public function dashboard(): JsonResponse
    {
        $byStatus = [];
        foreach (self::STATUSES as $status) {
            $byStatus[$status] = Order::query()->where('status', $status)->count();
        }

        $from = Carbon::now()->startOfDay()->subDays(29);
        $raw = Order::query()
            ->where('created_at', '>=', $from)
            ->get(['created_at'])
            ->groupBy(fn (Order $order) => $order->created_at->toDateString())
            ->map->count();

        $days = [];
        for ($i = 0; $i < 30; $i++) {
            $date = $from->copy()->addDays($i)->toDateString();
            $days[] = [
                'date' => $date,
                'count' => (int) ($raw[$date] ?? 0),
            ];
        }

        $recent = Order::query()->withCount('items')->latest('id')->limit(5)->get();

        return response()->json([
            'orders_total' => Order::query()->count(),
            'orders_by_status' => $byStatus,
            'completed_revenue' => Order::money(Order::query()->where('status', 'completed')->sum('total')),
            'orders_last_30_days' => $days,
            'recent_orders' => $recent->map(fn (Order $order) => $this->listPayload($order))->values(),
            'products' => [
                'visible' => Product::query()->where('in_feed', true)->where('is_hidden', false)->count(),
                'hidden' => Product::query()->where('is_hidden', true)->count(),
                'gone' => Product::query()->where('in_feed', false)->count(),
            ],
            'last_sync_at' => optional(Product::query()->max('synced_at'), fn ($value) => Carbon::parse($value)->toISOString()),
        ]);
    }

    private function applySearch($query, Request $request): void
    {
        if (! $request->filled('q')) {
            return;
        }

        $q = trim((string) $request->query('q'));
        $query->where(function ($inner) use ($q) {
            $inner->where('customer_name', 'like', '%'.$q.'%')
                ->orWhere('phone', 'like', '%'.$q.'%');

            $id = null;
            if (preg_match('/^SO-?0*(\d+)$/i', $q, $match)) {
                $id = (int) $match[1];
            } elseif (preg_match('/^\d+$/', $q)) {
                $id = (int) $q;
            }
            if ($id) {
                $inner->orWhere('id', $id);
            }
        });
    }

    private function applyDates($query, Request $request): void
    {
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->query('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->query('date_to'));
        }
    }

    private function listPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status,
            'customer_name' => $order->customer_name,
            'phone' => $order->phone,
            'address' => $order->address,
            'total' => Order::money($order->total),
            'item_count' => (int) ($order->items_count ?? $order->items()->count()),
            'created_at' => $order->created_at?->toISOString(),
        ];
    }

    private function detailPayload(Order $order): array
    {
        $order->loadMissing(['items', 'user']);
        $ids = $order->items->pluck('product_id')->filter()->unique()->all();
        $existing = $ids === [] ? collect() : Product::query()->whereIn('id', $ids)->pluck('id')->flip();

        return array_merge($this->listPayload($order), [
            'comment' => $order->comment,
            'attachment_url' => $this->attachmentUrl($order, true),
            'admin_note' => $order->admin_note,
            'updated_at' => $order->updated_at?->toISOString(),
            'user' => $order->user ? [
                'id' => $order->user->id,
                'phone' => $order->user->phone,
                'name' => $order->user->name,
            ] : null,
            'items' => $order->items->map(function ($item) use ($existing) {
                $price = Order::money($item->price_snapshot);
                $qty = (int) $item->quantity;

                return [
                    'product_id' => $item->product_id,
                    'product_code' => $item->product_code,
                    'name' => $item->name_snapshot,
                    'price' => $price,
                    'quantity' => $qty,
                    'line_total' => Order::money($price * $qty),
                    'product_exists' => $item->product_id !== null && $existing->has($item->product_id),
                ];
            })->values(),
        ]);
    }
}
