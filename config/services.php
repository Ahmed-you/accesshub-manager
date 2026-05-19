<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'accesshub_mail' => [
        'provider' => env('ACCESSHUB_MAIL_PROVIDER', 'laravel'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY'),
        'from_address' => env('BREVO_FROM_ADDRESS', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
        'from_name' => env('BREVO_FROM_NAME', env('MAIL_FROM_NAME', 'AccessHub Manager')),
    ],

    'exchange_rates' => [
        'ca_bundle' => env('EXCHANGE_RATE_CA_BUNDLE'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
