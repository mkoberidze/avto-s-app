<?php

return [
    'enabled' => (bool) env('TRANSLATION_ENABLED', false),
    'api_key' => env('GROQ_API_KEY'),
    'base_url' => env('TRANSLATION_BASE_URL', 'https://api.groq.com/openai/v1'),
    'model' => env('TRANSLATION_MODEL', 'openai/gpt-oss-120b'),
    'extra_params' => [],
    'languages' => [
        'en' => 'English',
        'ru' => 'Russian',
    ],
    'batch_max_items' => (int) env('TRANSLATION_BATCH_MAX_ITEMS', 20),
    'batch_max_chars' => (int) env('TRANSLATION_BATCH_MAX_CHARS', 6000),
    'max_field_chars' => (int) env('TRANSLATION_MAX_FIELD_CHARS', 12000),
    'request_interval_ms' => (int) env('TRANSLATION_REQUEST_INTERVAL_MS', 2200),
    'daily_token_budget' => (int) env('TRANSLATION_DAILY_TOKEN_BUDGET', 0),
    'chars_per_token' => (float) env('TRANSLATION_CHARS_PER_TOKEN', 2),
];
