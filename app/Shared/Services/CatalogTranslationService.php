<?php

namespace App\Shared\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CatalogTranslationService
{
    public const WARN_NO_OPENAI = 'no_openai_key';

    public const WARN_TRANSLATION_FAILED = 'translation_failed';

    public const WARN_RATE_LIMIT = 'rate_limit';

    public const WARN_NO_BALANCE = 'no_openai_balance';

    public const WARN_INVALID_KEY = 'invalid_openai_key';

    private ?int $lastHttpStatus = null;

    private ?string $lastOpenAiCode = null;

    public function __construct(
        protected OpenAiErrorParser $openAiErrors,
    ) {}

    /**
     * On update: if English is still empty in DB, ensure Arabic source keys are present for auto-fill.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $map
     * @return array<string, mixed>
     */
    public function mergeArabicSourcesForEmptyEnglish(array $data, object $model, array $map): array
    {
        foreach ($map as $arKey => $enKey) {
            $modelAr = trim((string) ($model->{$arKey} ?? ''));
            $modelEn = trim((string) ($model->{$enKey} ?? ''));
            $requestEn = trim((string) ($data[$enKey] ?? ''));
            $requestAr = trim((string) ($data[$arKey] ?? ''));

            if ($this->isUsableManualEnglish($requestEn, $requestAr !== '' ? $requestAr : $modelAr)) {
                continue;
            }
            if ($this->isUsableManualEnglish($modelEn, $modelAr)) {
                continue;
            }
            if ($requestAr !== '') {
                continue;
            }
            if ($modelAr !== '') {
                $data[$arKey] = $modelAr;
            }
        }

        return $data;
    }

    /**
     * Fill English catalog fields from Arabic source keys (OpenAI only — never copies Arabic into EN).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $map  Arabic field => English field
     * @return array<string, mixed>
     */
    /**
     * Drop bogus "English" copied from Arabic (legacy saves / bad API responses).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $map
     * @return array<string, mixed>
     */
    public function sanitizeManualEnglishInData(array $data, array $map): array
    {
        foreach ($map as $arKey => $enKey) {
            if (! array_key_exists($enKey, $data)) {
                continue;
            }
            $en = trim((string) $data[$enKey]);
            $ar = trim((string) ($data[$arKey] ?? ''));
            if ($en === '' || $this->isUsableManualEnglish($en, $ar)) {
                continue;
            }
            unset($data[$enKey]);
        }

        return $data;
    }

    public function isUsableManualEnglish(?string $en, ?string $ar): bool
    {
        $en = trim((string) $en);
        $ar = trim((string) $ar);
        if ($en === '') {
            return false;
        }
        if ($this->isSameAsArabicSource($en, $ar)) {
            return false;
        }

        return $this->containsLatinLetters($en);
    }

    public function applyEnglishFromArabic(array $data, array $map): array
    {
        $data = $this->sanitizeManualEnglishInData($data, $map);

        $toTranslate = [];
        foreach ($map as $arKey => $enKey) {
            $manualEn = trim((string) ($data[$enKey] ?? ''));
            $arText = trim((string) ($data[$arKey] ?? ''));
            if ($this->isUsableManualEnglish($manualEn, $arText)) {
                $data[$enKey] = $manualEn;

                continue;
            }
            if (! array_key_exists($arKey, $data)) {
                continue;
            }
            $text = trim((string) ($data[$arKey] ?? ''));
            if ($text === '') {
                $data[$enKey] = null;

                continue;
            }
            $toTranslate[$enKey] = $text;
        }

        if ($toTranslate === []) {
            return $data;
        }

        $translated = $this->translateToEnglish($toTranslate);
        foreach (array_keys($toTranslate) as $enKey) {
            $value = trim((string) ($translated[$enKey] ?? ''));
            $data[$enKey] = $value !== '' ? $value : null;
        }

        return $data;
    }

    public function isAutoTranslationAvailable(): bool
    {
        return filled(config('services.openai.key'));
    }

    /**
     * @param  array<string, string>  $map
     */
    public function translationWarning(array $data, array $map): ?string
    {
        foreach ($map as $arKey => $enKey) {
            if (trim((string) ($data[$arKey] ?? '')) === '') {
                continue;
            }
            if (trim((string) ($data[$enKey] ?? '')) !== '') {
                continue;
            }

            if (! $this->isAutoTranslationAvailable()) {
                return self::WARN_NO_OPENAI;
            }

            if ($this->lastOpenAiCode !== null) {
                return match ($this->openAiErrors->catalogWarningCode($this->lastOpenAiCode)) {
                    'no_openai_balance' => self::WARN_NO_BALANCE,
                    'rate_limit' => self::WARN_RATE_LIMIT,
                    'invalid_openai_key' => self::WARN_INVALID_KEY,
                    default => self::WARN_TRANSLATION_FAILED,
                };
            }

            return self::WARN_TRANSLATION_FAILED;
        }

        return null;
    }

    public function warningMessage(?string $code, bool $ar = true): ?string
    {
        if ($code === null) {
            return null;
        }

        return match ($code) {
            self::WARN_NO_OPENAI => $ar
                ? 'لم تُترجم الحقول للإنجليزية: أضف OPENAI_API_KEY في .env على السيرفر ثم php artisan config:cache، أو اكتب الإنجليزي يدوياً.'
                : 'English not auto-filled: set OPENAI_API_KEY in server .env (then config:cache) or enter English manually.',
            self::WARN_NO_BALANCE => $this->openAiErrors->userMessage(OpenAiErrorParser::INSUFFICIENT_QUOTA, $ar)
                .($ar ? ' أو اكتب الإنجليزي يدوياً.' : ' Or enter English manually.'),
            self::WARN_INVALID_KEY => $this->openAiErrors->userMessage(OpenAiErrorParser::INVALID_KEY, $ar),
            self::WARN_RATE_LIMIT => $this->openAiErrors->userMessage(OpenAiErrorParser::RATE_LIMIT, $ar),
            self::WARN_TRANSLATION_FAILED => $this->openAiErrors->userMessage(OpenAiErrorParser::GENERIC, $ar)
                .($ar ? ' أو اكتب الإنجليزي يدوياً.' : ' Or enter English manually.'),
            default => null,
        };
    }

    /**
     * @param  array<string, string>  $fields  English field key => Arabic source text
     * @return array<string, string>  English field key => English text (empty if unavailable)
     */
    public function translateToEnglish(array $fields): array
    {
        $empty = array_fill_keys(array_keys($fields), '');
        $this->lastHttpStatus = null;
        $this->lastOpenAiCode = null;

        $key = config('services.openai.key');
        if (! $key) {
            Log::warning('CatalogTranslationService: OPENAI_API_KEY missing; English fields not auto-filled');

            return $empty;
        }

        $payload = json_encode($fields, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return $empty;
        }

        try {
            $response = $this->requestOpenAiTranslation($key, $payload, retryOn429: true);

            if (! $response->successful()) {
                $this->lastHttpStatus = $response->status();
                $this->lastOpenAiCode = $this->openAiErrors->classifyResponse($response);
                Log::warning('CatalogTranslationService: OpenAI error', [
                    'status' => $response->status(),
                    'openai_code' => $this->lastOpenAiCode,
                    'body' => $response->body(),
                ]);

                return $empty;
            }

            $content = data_get($response->json(), 'choices.0.message.content');
            if (! is_string($content)) {
                return $empty;
            }

            $decoded = json_decode($content, true);
            if (! is_array($decoded)) {
                return $empty;
            }

            $out = [];
            foreach ($fields as $fieldKey => $arText) {
                $en = $decoded[$fieldKey] ?? '';
                $en = is_string($en) ? trim($en) : '';
                if ($en === '' || $this->isSameAsArabicSource($en, $arText)) {
                    $out[$fieldKey] = '';

                    continue;
                }
                $out[$fieldKey] = $en;
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('CatalogTranslationService: '.$e->getMessage());

            return $empty;
        }
    }

    /**
     * @param  array<string, string>  $map
     * @return list<string>  English column names to set NULL (remove stale Arabic copies)
     */
    public function englishFieldsToClear(object $model, array $data, array $map): array
    {
        $clear = [];
        foreach ($map as $arKey => $enKey) {
            if (filled($data[$enKey] ?? null)) {
                continue;
            }
            $modelEn = $model->{$enKey} ?? null;
            $modelAr = $model->{$arKey} ?? null;
            if ($modelEn && ! $this->isUsableManualEnglish((string) $modelEn, (string) $modelAr)) {
                $clear[] = $enKey;
            }
        }

        return $clear;
    }

    private function isSameAsArabicSource(string $english, string $arabic): bool
    {
        if ($english === $arabic) {
            return true;
        }

        return $this->containsArabicScript($english) && ! $this->containsLatinLetters($english);
    }

    private function containsArabicScript(string $text): bool
    {
        return preg_match('/[\x{0600}-\x{06FF}]/u', $text) === 1;
    }

    private function containsLatinLetters(string $text): bool
    {
        return preg_match('/[A-Za-z]/', $text) === 1;
    }

    private function requestOpenAiTranslation(string $apiKey, string $payloadJson, bool $retryOn429): \Illuminate\Http\Client\Response
    {
        $request = fn () => Http::withToken($apiKey)
            ->timeout(45)
            ->connectTimeout(15)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('services.openai.model', 'gpt-4o-mini'),
                'temperature' => 0.2,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You translate Arabic e-commerce catalog text into natural English for a sports/fashion store. '
                            .'Output must be English only (Latin script). Keep brand names, SKUs, sizes, and numbers unchanged. '
                            .'Return JSON only: same keys as input, values in English. No extra keys.',
                    ],
                    [
                        'role' => 'user',
                        'content' => $payloadJson,
                    ],
                ],
            ]);

        $response = $request();
        if ($retryOn429 && $response->status() === 429) {
            $kind = $this->openAiErrors->classifyResponse($response);
            if ($kind !== OpenAiErrorParser::INSUFFICIENT_QUOTA) {
                usleep(2_500_000);
                $response = $request();
            }
        }

        return $response;
    }
}
