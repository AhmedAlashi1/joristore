<?php

namespace App\Shared\Services;

use Illuminate\Http\Client\Response;

class OpenAiErrorParser
{
    public const INSUFFICIENT_QUOTA = 'insufficient_quota';

    public const RATE_LIMIT = 'rate_limit';

    public const INVALID_KEY = 'invalid_api_key';

    public const GENERIC = 'openai_error';

    public function classify(int $httpStatus, ?string $responseBody): string
    {
        $json = is_string($responseBody) && $responseBody !== '' ? json_decode($responseBody, true) : null;
        $code = strtolower((string) data_get($json, 'error.code', ''));
        $type = strtolower((string) data_get($json, 'error.type', ''));
        $message = strtolower((string) data_get($json, 'error.message', ''));

        if ($this->isInsufficientQuota($code, $type, $message)) {
            return self::INSUFFICIENT_QUOTA;
        }

        if ($httpStatus === 401 || $code === 'invalid_api_key' || str_contains($message, 'incorrect api key')) {
            return self::INVALID_KEY;
        }

        if ($httpStatus === 429) {
            return $this->isInsufficientQuota($code, $type, $message)
                ? self::INSUFFICIENT_QUOTA
                : self::RATE_LIMIT;
        }

        return self::GENERIC;
    }

    public function classifyResponse(Response $response): string
    {
        return $this->classify($response->status(), $response->body());
    }

    public function userMessage(string $code, bool $ar = true): string
    {
        return match ($code) {
            self::INSUFFICIENT_QUOTA => $ar
                ? 'فش رصيد في OpenAI — شحن الحساب من platform.openai.com ثم حاول مجدداً.'
                : 'OpenAI balance exhausted — add credits at platform.openai.com.',
            self::RATE_LIMIT => $ar
                ? 'OpenAI: تجاوزت حد الطلبات — انتظر دقيقة وحاول مجدداً.'
                : 'OpenAI rate limit — wait a minute and retry.',
            self::INVALID_KEY => $ar
                ? 'مفتاح OpenAI غير صالح — تحقق من OPENAI_API_KEY على السيرفر ثم php artisan config:cache.'
                : 'Invalid OpenAI API key — check OPENAI_API_KEY on the server.',
            default => $ar
                ? 'تعذّر الاتصال بـ OpenAI — حاول لاحقاً أو اكتب الإنجليزي يدوياً.'
                : 'OpenAI request failed — try again later.',
        };
    }

    public function catalogWarningCode(string $openAiCode): string
    {
        return match ($openAiCode) {
            self::INSUFFICIENT_QUOTA => 'no_openai_balance',
            self::RATE_LIMIT => 'rate_limit',
            self::INVALID_KEY => 'invalid_openai_key',
            default => 'translation_failed',
        };
    }

    private function isInsufficientQuota(string $code, string $type, string $message): bool
    {
        if ($code === self::INSUFFICIENT_QUOTA || $type === self::INSUFFICIENT_QUOTA) {
            return true;
        }

        return str_contains($message, 'insufficient_quota')
            || str_contains($message, 'exceeded your current quota')
            || str_contains($message, 'billing hard limit')
            || str_contains($message, 'check your plan and billing');
    }
}
