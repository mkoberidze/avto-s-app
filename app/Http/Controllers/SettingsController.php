<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        try {
            $settings = Setting::all()->pluck('value', 'key')->toArray();
            return response()->json($settings);
        } catch (\Exception $e) {
            return response()->json([], 200);
        }
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'logo_url' => 'nullable|string',
            'favicon_url' => 'nullable|string',
            'carousel_images' => 'nullable|array',
        ]);

        foreach ($data as $key => $value) {
            if ($key === 'carousel_images') {
                Setting::set($key, json_encode($value));
            } else {
                Setting::set($key, $value);
            }
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|file|image|mimes:jpg,jpeg,png,gif,svg,webp|max:51200',
        ]);

        $path = $request->file('logo')->store('settings', 'public');
        $url = url('storage/' . $path);

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
        $url = url('storage/' . $path);

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

        $path = $request->file('carousel_image')->store('carousel', 'public');
        // Use the full URL with current request scheme and host
        $url = url('storage/' . $path);

        try {
            $carousel_images = json_decode(Setting::get('carousel_images', '[]'), true) ?? [];
            $carousel_images[$request->index] = $url;
            Setting::set('carousel_images', json_encode($carousel_images));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Settings table not found. Please run migrations: php artisan migrate'], 500);
        }

        return response()->json(['carousel_images' => $carousel_images]);
    }
}

