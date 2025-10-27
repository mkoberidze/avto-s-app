<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\Request;

class AdminPageController extends Controller
{
    public function upsert(Request $request, string $slug)
    {
        $data = $request->validate([
            'title_en' => 'nullable|string',
            'title_ka' => 'nullable|string',
            'subtitle_en' => 'nullable|string',
            'subtitle_ka' => 'nullable|string',
            'body_en' => 'nullable|string',
            'body_ka' => 'nullable|string',
            'section_images' => 'nullable|array',
            'section_images.*' => 'nullable|image|max:5120',
        ]);

        // Handle sections manually since it might come as JSON string
        $sectionsJson = $request->input('sections', '[]');
        $sections = json_decode($sectionsJson, true) ?? [];
        
        // Validate sections structure manually
        if (is_array($sections)) {
            foreach ($sections as $index => $section) {
                if (isset($section['title_en']) && !is_string($section['title_en'])) {
                    return response()->json(['errors' => ["sections.$index.title_en" => ['Must be a string']]], 422);
                }
                if (isset($section['title_ka']) && !is_string($section['title_ka'])) {
                    return response()->json(['errors' => ["sections.$index.title_ka" => ['Must be a string']]], 422);
                }
                if (isset($section['body_en']) && !is_string($section['body_en'])) {
                    return response()->json(['errors' => ["sections.$index.body_en" => ['Must be a string']]], 422);
                }
                if (isset($section['body_ka']) && !is_string($section['body_ka'])) {
                    return response()->json(['errors' => ["sections.$index.body_ka" => ['Must be a string']]], 422);
                }
            }
        }
        
        // Handle image uploads for sections
        if ($request->hasFile('section_images')) {
            $uploadedFiles = $request->file('section_images');
            foreach ($uploadedFiles as $index => $file) {
                if ($file && isset($sections[$index])) {
                    $path = $file->store('page-sections', 'public');
                    $imageUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($path);
                    $sections[$index]['image_url'] = $imageUrl;
                }
            }
        }
        
        $pageData = array_merge($data, ['sections' => $sections, 'slug' => $slug]);
        
        $page = Page::updateOrCreate(['slug' => $slug], $pageData);
        return response()->json($page);
    }

    public function get(string $slug)
    {
        $page = Page::where('slug', $slug)->first();
        return response()->json($page);
    }
}


