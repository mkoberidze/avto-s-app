<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 25)));

        $query = ContactMessage::query();
        if ($request->has('handled') && $request->query('handled') !== '' && $request->query('handled') !== 'all') {
            $query->where('handled', $request->boolean('handled'));
        }

        $total = (clone $query)->count();
        $rows = $query->latest('id')->forPage($page, $perPage)->get();

        return response()->json([
            'messages' => $rows->map(fn (ContactMessage $row) => $this->payload($row))->values(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'handled' => ['required', 'boolean'],
        ]);

        $row = ContactMessage::query()->find($id);
        if (! $row) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $row->handled = $data['handled'];
        $row->save();

        return response()->json($this->payload($row));
    }

    private function payload(ContactMessage $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'phone' => $row->phone,
            'email' => $row->email,
            'message' => $row->message,
            'handled' => (bool) $row->handled,
            'created_at' => $row->created_at?->toISOString(),
        ];
    }
}
