<?php

namespace App\Http\Controllers;

use App\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class FormController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $forms = Form::where('user_id', $user->id)
            ->latest('id')
            ->get(['id','title','slug','status','input_one','input_two','input_three','created_at']);
        return response()->json($forms);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => ['required','string','max:255'],
            'input_one' => ['required','string','max:255'],
            'input_two' => ['required','string','max:2000'],
            'input_three' => ['required','string','max:255'],
            'attachment' => ['sometimes','file','mimetypes:application/pdf,application/octet-stream,image/jpeg,image/png,image/webp,application/acad,application/x-dwg','max:20480'],
        ]);

        $slugBase = Str::slug($data['title']);
        $slug = $slugBase;
        $i = 1;
        while (Form::where('slug', $slug)->exists()) {
            $slug = $slugBase.'-'.$i++;
        }

        $formData = [
            'user_id' => $user->id,
            'title' => $data['title'],
            'slug' => $slug,
            'status' => 'unopened',
            'input_one' => $data['input_one'],
            'input_two' => $data['input_two'],
            'input_three' => $data['input_three'],
        ];

        // attachment is optional
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('attachments', 'public');
            $formData['attachment_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($path);
        }

        $form = Form::create($formData);

        return response()->json($form, 201);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $form = Form::where('user_id', $user->id)->findOrFail($id);
        return response()->json($form);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $form = Form::where('user_id', $user->id)->findOrFail($id);
        $data = $request->validate([
            'title' => ['sometimes','string','max:255'],
            'status' => ['sometimes','string','in:unopened,under_review,in_progress,completed'],
            'input_one' => ['sometimes','string','max:255'],
            'input_two' => ['sometimes','string','max:2000'],
            'input_three' => ['sometimes','string','max:255'],
            'attachment' => ['sometimes','file','mimetypes:application/pdf,application/octet-stream,image/jpeg,image/png,image/webp,application/acad,application/x-dwg','max:20480'],
        ]);
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('attachments', 'public');
            $data['attachment_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($path);
        }
        $form->fill($data)->save();
        return response()->json($form);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $form = Form::where('user_id', $user->id)->findOrFail($id);
        $form->delete();
        return response()->json(['status' => 'ok']);
    }
}


