<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Order;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait ServesOrderAttachments
{
    protected function orderHasAttachment(Order $order): bool
    {
        if (is_string($order->attachment_path) && $order->attachment_path !== '') {
            return Storage::disk('local')->exists($order->attachment_path);
        }

        $publicPath = $this->publicAttachmentPath($order);

        return $publicPath !== null && Storage::disk('public')->exists($publicPath);
    }

    protected function attachmentUrl(Order $order, bool $admin): ?string
    {
        if (! $this->orderHasAttachment($order) && ! $this->legacyPublicUrl($order)) {
            return null;
        }

        return $admin
            ? url('/api/admin/orders/'.$order->id.'/attachment')
            : url('/api/orders/'.$order->id.'/attachment');
    }

    protected function streamOrderAttachment(Order $order): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $downloadName = $order->attachment_name ?: 'attachment';

        if (is_string($order->attachment_path) && $order->attachment_path !== '' && Storage::disk('local')->exists($order->attachment_path)) {
            return Storage::disk('local')->download($order->attachment_path, $downloadName);
        }

        $publicPath = $this->publicAttachmentPath($order);
        if ($publicPath !== null && Storage::disk('public')->exists($publicPath)) {
            if ($downloadName === 'attachment') {
                $downloadName = basename($publicPath);
            }

            return Storage::disk('public')->download($publicPath, $downloadName);
        }

        return response()->json(['message' => 'Not found'], 404);
    }

    private function legacyPublicUrl(Order $order): bool
    {
        return is_string($order->attachment_url) && $order->attachment_url !== '';
    }

    private function publicAttachmentPath(Order $order): ?string
    {
        if (! $this->legacyPublicUrl($order)) {
            return null;
        }

        $path = parse_url($order->attachment_url, PHP_URL_PATH) ?: $order->attachment_url;
        if (preg_match('#/storage/(.+)$#', $path, $match)) {
            return $match[1];
        }

        return null;
    }
}
