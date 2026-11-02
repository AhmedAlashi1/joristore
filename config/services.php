<?php

return [

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        'verify_ssl' => env('OPENAI_VERIFY_SSL', true),
    ],

    'webpush' => [
        'subject' => env('VAPID_SUBJECT', env('APP_URL', 'mailto:admin@sportsworldps.com')),
        'public_key' => ($k = env('VAPID_PUBLIC_KEY')) ? trim($k, " \t\n\r\0\x0B\"'") : null,
        'private_key' => ($k = env('VAPID_PRIVATE_KEY')) ? trim($k, " \t\n\r\0\x0B\"'") : null,
    ],

];
