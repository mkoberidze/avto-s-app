<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ServesOrderAttachments;
use App\Models\Order;
use App\Models\Product;
use App\Support\UbillSms;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    use ServesOrderAttachments;

    public function index(Request $request)
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->withCount('items')
            ->latest('id')
            ->get();

        return response()->json([
            'orders' => $orders->map(fn (Order $order) => $this->listPayload($order))->values(),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->with('items')
            ->find($id);

        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($this->detailPayload($order));
    }

    public function attachment(Request $request, int $id)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->find($id);

        if (! $order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return $this->streamOrderAttachment($order);
    }

    public function store(Request $request, UbillSms $sms)
    {
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:500'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'client_token' => ['nullable', 'string', 'max:64'],
            'attachment' => ['sometimes', 'file', 'max:20480'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        if ($request->hasFile('attachment')) {
            $error = $this->attachmentError($request->file('attachment'));
            if ($error !== null) {
                return response()->json(['message' => $error], 422);
            }
        }

        $user = $request->user();
        $token = isset($data['client_token']) && $data['client_token'] !== ''
            ? $data['client_token']
            : null;

        if ($token) {
            $existing = Order::query()
                ->where('user_id', $user->id)
                ->where('client_token', $token)
                ->withCount('items')
                ->first();
            if ($existing) {
                return response()->json($this->listPayload($existing), 200);
            }
        }

        $merged = [];
        foreach ($data['items'] as $line) {
            $productId = (int) $line['product_id'];
            $qty = (int) $line['quantity'];
            $merged[$productId] = min(99, ($merged[$productId] ?? 0) + $qty);
        }

        $unavailable = [];
        $snapshots = [];
        $total = 0.0;

        foreach ($merged as $productId => $quantity) {
            $product = Product::query()->find($productId);
            if (! $product || ! $product->in_feed || $product->is_hidden) {
                $unavailable[] = ['product_id' => (string) $productId, 'reason' => 'not_found'];

                continue;
            }
            if (! $product->in_stock) {
                $unavailable[] = ['product_id' => (string) $productId, 'reason' => 'out_of_stock'];

                continue;
            }
            $price = (string) $product->price;
            $snapshots[] = [
                'product_id' => $product->id,
                'product_code' => $product->product_code,
                'name_snapshot' => $product->name_ka,
                'price_snapshot' => $price,
                'quantity' => $quantity,
            ];
            $total += (float) $price * $quantity;
        }

        if ($unavailable !== []) {
            return response()->json([
                'message' => 'items_unavailable',
                'items' => $unavailable,
            ], 422);
        }

        $customerName = trim($data['customer_name']);

        try {
            $order = DB::transaction(function () use ($request, $user, $data, $token, $snapshots, $total, $customerName) {
                $order = Order::query()->create([
                    'user_id' => $user->id,
                    'status' => 'new',
                    'customer_name' => $customerName,
                    'phone' => $user->phone,
                    'address' => $data['address'],
                    'comment' => $data['comment'] ?? null,
                    'attachment_url' => null,
                    'attachment_path' => null,
                    'attachment_name' => null,
                    'total' => number_format($total, 2, '.', ''),
                    'client_token' => $token,
                ]);

                foreach ($snapshots as $item) {
                    $order->items()->create($item);
                }

                if ($request->hasFile('attachment')) {
                    $file = $request->file('attachment');
                    $ext = strtolower($file->getClientOriginalExtension());
                    $stored = Str::random(40).'.'.$ext;
                    $path = $file->storeAs('orders/'.$order->id, $stored, 'local');
                    $order->attachment_path = $path;
                    $order->attachment_name = $file->getClientOriginalName();
                    $order->save();
                }

                if ($user->name === null || trim((string) $user->name) === '') {
                    $user->name = $customerName;
                    $user->save();
                }

                return $order->loadCount('items');
            });
        } catch (QueryException $e) {
            if ($token) {
                $existing = Order::query()
                    ->where('user_id', $user->id)
                    ->where('client_token', $token)
                    ->withCount('items')
                    ->first();
                if ($existing) {
                    return response()->json($this->listPayload($existing), 200);
                }
            }
            throw $e;
        }

        try {
            $sms->notifyAdmins("ახალი შეკვეთა {$order->number}. ჯამი: {$order->total} ₾. ტელ: {$order->phone}");
        } catch (\Throwable $e) {
            Log::error('Order SMS failed');
        }

        return response()->json($this->listPayload($order), 201);
    }

    private function attachmentError($file): ?string
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $allowed = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dwg'];
        if (! in_array($ext, $allowed, true)) {
            return 'The attachment must be a file of type: pdf, jpg, jpeg, png, webp, dwg.';
        }

        if ($ext === 'dwg') {
            return null;
        }

        $mime = (string) $file->getMimeType();
        $expected = [
            'pdf' => ['application/pdf'],
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'webp' => ['image/webp'],
        ];
        if (! in_array($mime, $expected[$ext] ?? [], true)) {
            return 'The attachment file type is invalid.';
        }

        return null;
    }

    private function listPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'number' => $order->number,
            'status' => $order->status,
            'total' => Order::money($order->total),
            'item_count' => (int) ($order->items_count ?? $order->items()->count()),
            'created_at' => $order->created_at?->toISOString(),
        ];
    }

    private function detailPayload(Order $order): array
    {
        return array_merge($this->listPayload($order), [
            'customer_name' => $order->customer_name,
            'phone' => $order->phone,
            'address' => $order->address,
            'comment' => $order->comment,
            'attachment_url' => $this->attachmentUrl($order, false),
            'items' => $order->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_code' => $item->product_code,
                'name' => $item->name_snapshot,
                'price' => (string) $item->price_snapshot,
                'quantity' => (int) $item->quantity,
            ])->values(),
        ]);
    }
}
