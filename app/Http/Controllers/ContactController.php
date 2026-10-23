<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Support\GeorgianPhone;
use App\Support\UbillSms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class ContactController extends Controller
{
    public function store(Request $request, UbillSms $sms): JsonResponse
    {
        if (trim((string) $request->input('website', '')) !== '') {
            $this->hitIpLimit($request);

            return response()->json(['status' => 'ok'], 201);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'message' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $phone = GeorgianPhone::normalize($data['phone']);
        if (! GeorgianPhone::isValid($phone)) {
            throw ValidationException::withMessages([
                'phone' => ['Enter a Georgian mobile number.'],
            ]);
        }

        $ipKey = 'contact-ip:'.$request->ip();
        $phoneKey = 'contact-phone:'.$phone;
        $wait = 0;
        $blocked = false;
        if (RateLimiter::tooManyAttempts($ipKey, 5)) {
            $blocked = true;
            $wait = max($wait, RateLimiter::availableIn($ipKey));
        }
        if (RateLimiter::tooManyAttempts($phoneKey, 3)) {
            $blocked = true;
            $wait = max($wait, RateLimiter::availableIn($phoneKey));
        }
        if ($blocked) {
            return response()->json([
                'message' => 'too_many_attempts',
                'retry_after' => $wait,
            ], 429)->header('Retry-After', (string) $wait);
        }

        RateLimiter::hit($ipKey, 3600);
        RateLimiter::hit($phoneKey, 3600);

        $row = ContactMessage::query()->create([
            'name' => trim($data['name']),
            'phone' => $phone,
            'email' => isset($data['email']) && $data['email'] !== '' ? $data['email'] : null,
            'message' => $data['message'],
            'handled' => false,
            'ip' => $request->ip(),
        ]);

        try {
            $sms->notifyAdmins("ახალი შეტყობინება: {$row->name}, {$row->phone}");
        } catch (\Throwable $e) {
            Log::error('Contact SMS failed');
        }

        return response()->json(['status' => 'ok'], 201);
    }

    private function hitIpLimit(Request $request): void
    {
        $ipKey = 'contact-ip:'.$request->ip();
        if (! RateLimiter::tooManyAttempts($ipKey, 5)) {
            RateLimiter::hit($ipKey, 3600);
        }
    }
}
