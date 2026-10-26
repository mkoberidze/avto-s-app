<?php

return [
    'phone' => env('ADMIN_PHONE', '+10000000000'),
    'phones' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ADMIN_PHONES', '+995599677003'))
    ))),
    'password' => env('ADMIN_PASSWORD', 'secret'),
    'otp' => env('ADMIN_OTP'),
];
