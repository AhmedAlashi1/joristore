<?php

namespace App\Shared\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Free/paid providers for Arabic → English catalog fields. */
class CatalogTranslationBackend
{
    private ?string $lastDriver = null;

    private ?int $lastHttpStatus = null;

    private ?string $lastOpenAiCode = null;

    public function __construct(
        protected OpenAiErrorParser $openAiErrors,
    ) {}

    public function lastDriver(): ?string
    {
        return $this->lastDriver;
    }

    public function lastHttpStatus(): ?int
    {
        return $this->lastHttpStatus;
    }

    public function lastOpenAiCode(): ?string
    {
        return $this->lastOpenAiCode;
    }

    public function hasAnyProvider(): bool
    {
        $driver = (string) config('services.catalog_translation.driver', 'auto');

        return $driver === 'mymemory'
            || filled(config('services.gemini.key'))
            || filled(config('services.openai.key'))
            || $driver === 'auto';
    }

    /**
     * @param  array<string, string>  $fields  EN field key => Arabic text
     * @return array<string, string>
     */
    public function translateFields(array $fields): array
    {
        $empty = array_fill_keys(array_keys($fields), '');
        $this->lastDriver = null;
        $this->lastHttpStatus = null;
        $this->lastOpenAiCode = null;

        foreach ($this->driverOrder() as $driver) {
            $result = match ($driver) {
                'gemini' => $this->translateWithGemini($fields),
                'openai' => $this->translateWithOpenAi($fields),
                'mymemory' => $this->translateWithMyMemory($fields),
                default => $empty,
            };

            if ($this->hasUsableOutput($fields, $result)) {
                $this->lastDriver = $driver;

                return $result;
            }
        }

        return $empty;
    }

    /** @return list<string> */
    private function driverOrder(): array
    {
        $configured = strtolower((string) config('services.catalog_translation.driver', 'auto'));

        if ($configured === 'mymemory') {
            return ['mymemory'];
        }
        if ($configured === 'gemini') {
            return array_filter(['gemini', 'mymemory']);
        }
        if ($configured === 'openai') {
            return array_filter(['openai', 'gemini', 'mymemory']);
        }

        // auto: free providers first (skip slow OpenAI 429 when billing is empty)
        $order = [];
        if (filled(config('services.gemini.key'))) {
            $order[] = 'gemini';
        }
        $order[] = 'mymemory';
        if (filled(config('services.openai.key'))) {
            $order[] = 'openai';
        }

        return array_values(array_unique($order));
    }

    /**
     * @param  array<string, string>  $fields
     * @param  array<string, string>  $result
     */
    private function hasUsableOutput(array $fields, array $result): bool
    {
        foreach ($fields as $fieldKey => $arText) {
            $en = trim($result[$fieldKey] ?? '');
            if ($en !== '' && ! $this->isSameAsArabicSource($en, $arText)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, string>  $fields
     * @return array<string, string>
     */
    private function translateWithMyMemory(array $fields): array
    {
        $out = [];
        foreach ($fields as $fieldKey => $arText) {
            $arText = trim($arText);
            if ($arText === '') {
                $out[$fieldKey] = '';

                continue;
            }

            $chunks = $this->chunkText($arText, 450);
            $parts = [];
            foreach ($chunks as $chunk) {
                try {
                    $response = Http::timeout(25)
                        ->get('https://api.mymemory.translated.net/get', [
                            'q' => $chunk,
                            'langpair' => 'ar|en',
                        ]);

                    if (! $response->successful()) {
                        $this->lastHttpStatus = $response->status();
                        Log::warning('CatalogTranslationBackend: MyMemory HTTP error', ['status' => $response->status()]);

                        continue;
                    }

                    $translated = trim((string) data_get($response->json(), 'responseData.translatedText', ''));
                    if ($translated !== '' && ! $this->isSameAsArabicSource($translated, $chunk)) {
                        $parts[] = $translated;
                    }
                } catch (\Throwable $e) {
                    Log::warning('CatalogTranslationBackend: MyMemory '.$e->getMessage());
                }
            }

            $joined = trim(implode(' ', $parts));
            $out[$fieldKey] = ($joined !== '' && $this->containsLatinLetters($joined)) ? $joined : '';
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $fields
     * @return array<string, string>
     */
    private function translateWithGemini(array $fields): array
    {
        $empty = array_fill_keys(array_keys($fields), '');
        $key = config('services.gemini.key');
        if (! $key) {
            return $empty;
        }

        $payload = json_encode($fields, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return $empty;
        }

        $model = (string) config('services.gemini.model', 'gemini-1.5-flash');
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'.$model.':generateContent';

        try {
            $response = Http::timeout(45)
                ->withQueryParameters(['key' => $key])
                ->post($url, [
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'responseMimeType' => 'application/json',
                    ],
                    'contents' => [
                        [
                            'parts' => [
                                [
                                    'text' => 'Translate Arabic e-commerce catalog strings to natural English. '
                                        .'Return JSON only with the same keys as input. English only (Latin letters). Input: '.$payload,
                                ],
                            ],
                        ],
                    ],
                ]);

            if (! $response->successful()) {
                $this->lastHttpStatus = $response->status();
                Log::warning('CatalogTranslationBackend: Gemini error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return $empty;
            }

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');
            if (! is_string($content)) {
                return $empty;
            }

            $decoded = json_decode($content, true);
            if (! is_array($decoded)) {
                return $empty;
            }

            $out = [];
            foreach ($fields as $fieldKey => $arText) {
                $out[$fieldKey] = $this->pickTranslatedValue($decoded, $fieldKey, $arText);
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('CatalogTranslationBackend: Gemini '.$e->getMessage());

            return $empty;
        }
    }

    /**
     * @param  array<string, string>  $fields
     * @return array<string, string>
     */
    private function translateWithOpenAi(array $fields): array
    {
        $empty = array_fill_keys(array_keys($fields), '');
        $key = config('services.openai.key');
        if (! $key) {
            return $empty;
        }

        $payload = json_encode($fields, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return $empty;
        }

        try {
            $verify = filter_var(config('services.openai.verify_ssl', true), FILTER_VALIDATE_BOOL);
            $request = fn () => Http::withToken($key)
                ->withOptions(['verify' => $verify])
                ->timeout(45)
                ->connectTimeout(15)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'temperature' => 0.2,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You translate Arabic e-commerce catalog text into natural English. '
                                .'Output must be English only (Latin script). Return JSON only: same keys as input.',
                        ],
                        ['role' => 'user', 'content' => $payload],
                    ],
                ]);

            $response = $request();
            if ($response->status() === 429) {
                $kind = $this->openAiErrors->classifyResponse($response);
                if ($kind !== OpenAiErrorParser::INSUFFICIENT_QUOTA) {
                    usleep(2_500_000);
                    $response = $request();
                }
            }

            if (! $response->successful()) {
                $this->lastHttpStatus = $response->status();
                $this->lastOpenAiCode = $this->openAiErrors->classifyResponse($response);
                Log::warning('CatalogTranslationBackend: OpenAI error', [
                    'status' => $response->status(),
                    'openai_code' => $this->lastOpenAiCode,
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
                $out[$fieldKey] = $this->pickTranslatedValue($decoded, $fieldKey, $arText);
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('CatalogTranslationBackend: OpenAI '.$e->getMessage());

            return $empty;
        }
    }

    /** @return list<string> */
    private function chunkText(string $text, int $maxLen): array
    {
        if (mb_strlen($text) <= $maxLen) {
            return [$text];
        }

        $chunks = [];
        $offset = 0;
        $len = mb_strlen($text);
        while ($offset < $len) {
            $chunks[] = mb_substr($text, $offset, $maxLen);
            $offset += $maxLen;
        }

        return $chunks;
    }

    /**
     * @param  array<string, mixed>  $decoded
     */
    private function pickTranslatedValue(array $decoded, string $fieldKey, string $arText): string
    {
        $candidates = array_unique([
            $fieldKey,
            str_replace('_en', '', $fieldKey),
            'translation',
            'text',
            'value',
        ]);

        foreach ($candidates as $key) {
            if (! isset($decoded[$key]) || ! is_string($decoded[$key])) {
                continue;
            }
            $en = trim($decoded[$key]);
            if ($en === '' || $this->isSameAsArabicSource($en, $arText)) {
                continue;
            }

            return $en;
        }

        return '';
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
}
