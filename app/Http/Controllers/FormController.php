<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class FormController extends Controller
{
    private function normalizePhone(string $raw): string
    {
        $raw = trim($raw);
        if (str_starts_with($raw, '+')) {
            return '+'.preg_replace('/\D+/', '', substr($raw, 1));
        }
        return preg_replace('/\D+/', '', $raw);
    }

    private function sendSms(string $phone, string $message): void
    {
        try {
            $apiKey = config('services.ubill.api_key');
            $brandId = config('services.ubill.brand_id');
            
            if (!$apiKey || !$brandId) {
                \Log::warning('SMS not sent: UBILL_API_KEY or UBILL_BRAND_ID not configured');
                return;
            }

            $normalizedPhone = $this->normalizePhone($phone);
            $phoneForApi = str_replace('+', '', $normalizedPhone);
            $encodedMessage = urlencode($message);

            $url = "https://api.ubill.dev/v1/sms/send?key={$apiKey}&brandID={$brandId}&numbers={$phoneForApi}&text={$encodedMessage}&stopList=false";
            
            $response = @file_get_contents($url);
            
            if ($response === false) {
                \Log::error('Failed to send SMS notification', [
                    'phone' => $phoneForApi,
                    'url' => $url
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Exception while sending SMS', [
                'phone' => $phone,
                'message' => $e->getMessage()
            ]);
        }
    }

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

        // Notify admin users about the new form
        try {
            $adminUsers = User::role('admin')->get();
            $userPhone = $user->phone ?? 'Unknown';
            $directionLabels = [
                'fire' => 'სახანძრო უსაფრთხოება',
                'cctv' => 'კამერები',
                'access' => 'დაშვების სისტემა'
            ];
            $directionLabel = $directionLabels[$data['input_one']] ?? $data['input_one'];
            
            $message = "ახალი განაცხადი: {$directionLabel}. მომხმარებელი: {$userPhone}. ID: {$form->id}";
            
            foreach ($adminUsers as $admin) {
                if ($admin->phone) {
                    $this->sendSms($admin->phone, $message);
                }
            }
        } catch (\Exception $e) {
            // Log error but don't fail the form creation
            \Log::error('Failed to send admin notification SMS', [
                'form_id' => $form->id,
                'error' => $e->getMessage()
            ]);
        }

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


