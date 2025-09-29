<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function show(string $slug)
    {
        $page = Page::where('slug', $slug)->first();
        if (!$page) {
            return response()->json(null, 204);
        }
        return response()->json($page);
    }
}


