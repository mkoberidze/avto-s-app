<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UbillSms
{
    public function send(string $phone, string $message): bool
    {
        $normalized = GeorgianPhone::normalize($phone);

        if (config('services.sms_driver', 'ubill') === 'log') {
            Log::info('SMS', [
                'phone' => $normalized,
                'message' => $message,
            ]);

            return true;
        }

        try {
            $apiKey = config('services.ubill.api_key');
            $brandId = config('services.ubill.brand_id');
            $phoneForApi = str_replace('+', '', $normalized);
            $encodedMessage = urlencode($message);
            $url = "https://api.ubill.dev/v1/sms/send?key={$apiKey}&brandID={$brandId}&numbers={$phoneForApi}&text={$encodedMessage}&stopList=false";

            $response = Http::timeout(5)->get($url);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('SMS send failed');

            return false;
        }
    }

    public function sendIfConfigured(string $phone, string $message): bool
    {
        if (config('services.sms_driver', 'ubill') === 'log') {
            return $this->send($phone, $message);
        }

        if (! config('services.ubill.api_key') || ! config('services.ubill.brand_id')) {
            Log::warning('SMS not sent: UBILL_API_KEY or UBILL_BRAND_ID not configured');

            return false;
        }

        return $this->send($phone, $message);
    }

    public function notifyAdmins(string $message): void
    {
        foreach (User::role('admin')->get() as $admin) {
            if ($admin->phone) {
                $this->sendIfConfigured($admin->phone, $message);
            }
        }
    }

}
