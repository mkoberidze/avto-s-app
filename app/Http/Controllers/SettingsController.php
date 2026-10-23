<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private const EXTRA_KEYS = [
        'store_name',
        'contact_email',
        'phone',
        'address',
        'delivery_note',
    ];

    private const WRITABLE = [
        'logo_url',
        'favicon_url',
        'carousel_images',
        'store_name',
        'contact_email',
        'phone',
        'address',
        'delivery_note',
    ];

    public function index()
    {
        try {
            $settings = Setting::all()->pluck('value', 'key')->toArray();
        } catch (\Exception $e) {
            return response()->json([], 200);
        }

        return response()->json($this->normalize($settings));
    }

    public function update(Request $request)
    {
        $extra = array_values(array_diff(array_keys($request->all()), self::WRITABLE));
        if ($extra !== []) {
            return response()->json([
                'message' => 'Unexpected settings keys.',
                'fields' => $extra,
            ], 422);
        }

        $data = $request->validate([
            'logo_url' => 'nullable|string|max:2048',
            'favicon_url' => 'nullable|string|max:2048',
            'carousel_images' => 'nullable|array|max:3',
            'carousel_images.*' => 'nullable|string|max:2048',
            'store_name' => 'nullable|string|max:120',
            'contact_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:40',
            'address' => 'nullable|string|max:255',
            'delivery_note' => 'nullable|string|max:2000',
        ]);

        foreach ($data as $key => $value) {
            if ($key === 'carousel_images') {
                Setting::set($key, json_encode(array_values($value)));
            } else {
                Setting::set($key, $value ?? '');
            }
        }

        return response()->json($this->normalize(Setting::all()->pluck('value', 'key')->toArray()));
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|file|image|mimes:jpg,jpeg,png,gif,svg,webp|max:51200',
        ]);

        $path = $request->file('logo')->store('settings', 'public');
        $url = url('storage/'.$path);

        try {
            Setting::set('logo_url', $url);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Settings table not found. Please run migrations: php artisan migrate'], 500);
        }

        return response()->json(['logo_url' => $url]);
    }

    public function uploadFavicon(Request $request)
    {
        $request->validate([
            'favicon' => 'required|file|image|mimes:jpg,jpeg,png,gif,svg,webp,ico|max:5120',
        ]);

        $path = $request->file('favicon')->store('settings', 'public');
        $url = url('storage/'.$path);

        try {
            Setting::set('favicon_url', $url);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Settings table not found. Please run migrations: php artisan migrate'], 500);
        }

        return response()->json(['favicon_url' => $url]);
    }

    public function uploadCarouselImage(Request $request)
    {
        $request->validate([
            'carousel_image' => 'required|file|image|mimes:jpg,jpeg,png,gif,svg,webp|max:51200',
            'index' => 'required|integer|min:0|max:2',
        ]);

        $file = $request->file('carousel_image');
        $path = $file->store('carousel', 'public');
        $url = url('storage/'.$path);

        try {
            $carousel_images = json_decode(Setting::get('carousel_images', '[]'), true) ?? [];
            if (! is_array($carousel_images)) {
                $carousel_images = [];
            }
            $slots = [
                $carousel_images[0] ?? '',
                $carousel_images[1] ?? '',
                $carousel_images[2] ?? '',
            ];
            $slots[(int) $request->index] = $url;
            Setting::set('carousel_images', json_encode($slots));
            $carousel_images = $slots;
        } catch (\Exception $e) {
            return response()->json(['error' => 'Settings table not found. Please run migrations: php artisan migrate'], 500);
        }

        return response()->json(['carousel_images' => $carousel_images]);
    }

    private function normalize(array $settings): array
    {
        $images = $settings['carousel_images'] ?? [];
        if (is_string($images)) {
            $decoded = json_decode($images, true);
            $images = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($images)) {
            $images = [];
        }
        $settings['carousel_images'] = array_values($images);

        foreach (self::EXTRA_KEYS as $key) {
            $settings[$key] = isset($settings[$key]) ? (string) $settings[$key] : '';
        }

        $settings['logo_url'] = isset($settings['logo_url']) ? (string) $settings['logo_url'] : '';
        $settings['favicon_url'] = isset($settings['favicon_url']) ? (string) $settings['favicon_url'] : '';

        return $settings;
    }
}
