<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Ichtrojan\Otp\Otp;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    private function normalizePhone(string $raw): string
    {
        $raw = trim($raw);
        if (str_starts_with($raw, '+')) {
            return '+'.preg_replace('/\D+/', '', substr($raw, 1));
        }
        return preg_replace('/\D+/', '', $raw);
    }

    private function normalizeOtp(string $raw): string
    {
        return preg_replace('/\D+/', '', trim($raw));
    }

    public function requestOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
        ]);

        $phone = $this->normalizePhone($data['phone']);

        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            [
                'name' => null,
                // Fallback email for schemas where email is non-nullable
                'email' => $phone.'@example.local',
                'password' => bcrypt(str()->random(32)),
            ]
        );

        $otp = new Otp();
        $otpCode = $otp->generate($phone, 'numeric', 6, 10);

        $apiKey = config('services.ubill.api_key');
        $brandId = config('services.ubill.brand_id');
        $message = urlencode("{$otpCode->token}");

        $phone = str_replace('+', '', $phone);
        $url = "https://api.ubill.dev/v1/sms/send?key={$apiKey}&brandID={$brandId}&numbers={$phone}&text={$message}&stopList=false";
        $response = file_get_contents($url);

        return response()->json([
            'status' => 'ok',
            'message' => 'OTP generated. For testing, check the otps table.',
            'user_exists' => (bool) $user->wasRecentlyCreated === false,
            'response' => $response,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'otp' => ['required', 'string'],
        ]);

        $phone = $this->normalizePhone($data['phone']);
        $code = $this->normalizeOtp($data['otp']);

        $otp = new Otp();
        $verification = $otp->validate($phone, $code);

        if (! $verification->status) {
            return response()->json([
                'status' => 'error',
                'message' => $verification->message,
            ], 422);
        }

        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            [
                'name' => null,
                // Fallback email for schemas where email is non-nullable
                'email' => $phone.'@example.local',
                'password' => bcrypt(str()->random(32)),
            ]
        );

        Auth::login($user);

        // Ensure base roles exist and assign default 'user' role on first auth
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        if (! $user->hasRole('user')) {
            $user->assignRole($userRole);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'message' => 'Authenticated',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'phone' => $user->phone,
                'name' => $user->name,
                'role' => $user->getRoleNames()->first(),
            ],
        ]);
    }

    public function getUser(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'status' => 'ok',
            'user' => [
                'id' => $user->id,
                'phone' => $user->phone,
                'name' => $user->name,
                'role' => $user->getRoleNames()->first(),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Logged out successfully',
        ]);
    }
}


