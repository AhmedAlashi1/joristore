<?php

return [
    'host' => env('IMAP_HOST', env('MAIL_HOST', 'ocean-it.net')),
    'port' => (int) env('IMAP_PORT', 993),
    'encryption' => env('IMAP_ENCRYPTION', 'ssl'),
    'username' => env('IMAP_USERNAME', env('MAIL_USERNAME')),
    'password' => env('IMAP_PASSWORD', env('MAIL_PASSWORD')),
    'mailbox' => env('IMAP_MAILBOX', 'INBOX'),
    'sent_mailbox' => env('IMAP_SENT_MAILBOX', 'Sent'),
    'lookback_days' => (int) env('IMAP_LOOKBACK_DAYS', 30),
];
