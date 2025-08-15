<?php

namespace App\Http\Controllers;

use App\Models\Form;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function index()
    {
        $forms = Form::with('user:id,phone')
            ->latest('id')
            ->get();

        return response()->json($forms);
    }

    public function updateFormStatus(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:unopened,seen,completed'],
        ]);

        $form = Form::findOrFail($id);
        $form->update(['status' => $data['status']]);

        return response()->json($form);
    }
}
