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
            'body_en' => 'nullable|string',
            'body_ka' => 'nullable|string',
            'sections' => 'nullable|array',
            'sections.*.title_en' => 'nullable|string',
            'sections.*.title_ka' => 'nullable|string',
            'sections.*.body_en' => 'nullable|string',
            'sections.*.body_ka' => 'nullable|string',
        ]);

        $page = Page::updateOrCreate(['slug' => $slug], $data + ['slug' => $slug]);
        return response()->json($page);
    }

    public function get(string $slug)
    {
        $page = Page::where('slug', $slug)->first();
        return response()->json($page);
    }
}


