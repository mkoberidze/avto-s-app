<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\UbillSms;
use Ichtrojan\Otp\Models\Otp as OtpModel;
use Ichtrojan\Otp\Otp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    private const OTP_EXPIRES_IN = 600;

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

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'phone' => $user->phone,
            'name' => $user->name,
            'role' => $user->clientRole(),
        ];
    }

    private function retryAfterResponse(int $seconds): JsonResponse
    {
        return response()->json([
            'message' => 'too_many_attempts',
            'retry_after' => $seconds,
        ], 429)->header('Retry-After', (string) $seconds);
    }

    public function requestOtp(Request $request, UbillSms $sms)
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
        ]);

        $phone = $this->normalizePhone($data['phone']);
        $minuteKey = 'otp-request-min:'.$phone;
        $hourKey = 'otp-request-hour:'.$phone;
        $ipKey = 'otp-request-ip:'.$request->ip();

        $wait = 0;
        $blocked = false;
        foreach ([$minuteKey => 1, $hourKey => 5, $ipKey => 20] as $key => $max) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $blocked = true;
                $wait = max($wait, RateLimiter::availableIn($key));
            }
        }
        if ($blocked) {
            return $this->retryAfterResponse($wait);
        }

        RateLimiter::hit($minuteKey, 60);
        RateLimiter::hit($hourKey, 3600);
        RateLimiter::hit($ipKey, 3600);

        $otp = new Otp();
        $otpCode = $otp->generate($phone, 'numeric', 6, 10);

        $sent = $sms->send($phone, (string) $otpCode->token);
        if (! $sent) {
            OtpModel::query()->where('identifier', $phone)->update(['valid' => false]);

            return response()->json(['message' => 'sms_failed'], 503);
        }

        return response()->json([
            'status' => 'ok',
            'expires_in' => self::OTP_EXPIRES_IN,
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
        $verifyKey = 'otp-verify:'.$phone;

        if (RateLimiter::tooManyAttempts($verifyKey, 5)) {
            return $this->retryAfterResponse(RateLimiter::availableIn($verifyKey));
        }

        $otp = new Otp();
        $verification = $otp->validate($phone, $code);

        if (! $verification->status) {
            RateLimiter::hit($verifyKey, 600);

            return response()->json([
                'status' => 'error',
                'message' => $verification->message,
            ], 422);
        }

        RateLimiter::clear($verifyKey);

        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            [
                'name' => null,
                'email' => $phone.'@example.local',
                'password' => bcrypt(str()->random(32)),
            ]
        );

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        if (! $user->hasRole('admin') && ! $user->hasRole('user')) {
            $user->assignRole($userRole);
        }

        $minutes = (int) config('sanctum.expiration', 43200);
        $expiresAt = $minutes > 0 ? now()->addMinutes($minutes) : null;
        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'message' => 'Authenticated',
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function getUser(Request $request)
    {
        return response()->json([
            'status' => 'ok',
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function updateUser(Request $request)
    {
        $request->merge([
            'name' => trim((string) $request->input('name', '')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $user = $request->user();
        $user->name = $data['name'];
        $user->save();

        return response()->json([
            'status' => 'ok',
            'user' => $this->userPayload($user->fresh()),
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
