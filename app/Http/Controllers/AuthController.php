<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AdminPhones;
use App\Support\GeorgianPhone;
use App\Support\UbillSms;
use Ichtrojan\Otp\Models\Otp as OtpModel;
use Ichtrojan\Otp\Otp;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    private const OTP_EXPIRES_IN = 600;

    private function normalizePhone(string $raw): string
    {
        return GeorgianPhone::normalize($raw);
    }

    private function isAdminPhone(string $phone): bool
    {
        return AdminPhones::contains($phone);
    }

    private function matchesAdminOtp(string $phone, string $code): bool
    {
        $adminOtp = preg_replace('/\D+/', '', (string) config('admin.otp')) ?? '';

        return $adminOtp !== ''
            && $this->isAdminPhone($phone)
            && hash_equals($adminOtp, $code);
    }

    private function findOrCreateUser(string $phone): User
    {
        $matches = User::query()->whereIn('phone', GeorgianPhone::variants($phone))->get();
        $user = $matches->first(fn (User $candidate) => $candidate->phone === $phone)
            ?? $matches->first(fn (User $candidate) => $candidate->hasRole('admin'))
            ?? $matches->first();

        if (! $user) {
            try {
                return User::query()->create([
                    'phone' => $phone,
                    'name' => null,
                    'email' => $phone.'@example.local',
                    'password' => bcrypt(str()->random(32)),
                ]);
            } catch (UniqueConstraintViolationException $e) {
                $existing = User::query()->where('phone', $phone)->first();
                if ($existing) {
                    return $existing;
                }

                throw $e;
            }
        }

        if ($user->phone !== $phone && ! User::query()->where('phone', $phone)->whereKeyNot($user->id)->exists()) {
            try {
                $user->phone = $phone;
                $user->save();
            } catch (UniqueConstraintViolationException $e) {
                $canonical = User::query()->where('phone', $phone)->first();
                if ($canonical) {
                    return $canonical;
                }

                throw $e;
            }
        }

        return $user;
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
        $verification = $this->matchesAdminOtp($phone, $code)
            ? (object) ['status' => true]
            : $otp->validate($phone, $code);

        if (! $verification->status) {
            RateLimiter::hit($verifyKey, 600);

            return response()->json([
                'status' => 'error',
                'message' => $verification->message,
            ], 422);
        }

        RateLimiter::clear($verifyKey);

        $user = $this->findOrCreateUser($phone);

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        if ($this->isAdminPhone($phone) && ! $user->hasRole('admin')) {
            $user->assignRole($adminRole);
        } elseif (! $user->hasRole('admin') && ! $user->hasRole('user')) {
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
