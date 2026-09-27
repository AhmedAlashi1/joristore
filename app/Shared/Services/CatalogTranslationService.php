<?php

namespace App\Shared\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CatalogTranslationService
{
    /**
     * Fill English catalog fields from Arabic source keys.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $map  Arabic field => English field
     * @return array<string, mixed>
     */
    public function applyEnglishFromArabic(array $data, array $map): array
    {
        $toTranslate = [];
        foreach ($map as $arKey => $enKey) {
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
        foreach ($translated as $enKey => $value) {
            $data[$enKey] = $value !== '' ? $value : null;
        }

        return $data;
    }

    /**
     * @param  array<string, string>  $fields  key => Arabic text
     * @return array<string, string>
     */
    public function translateToEnglish(array $fields): array
    {
        $key = config('services.openai.key');
        if (! $key) {
            Log::warning('CatalogTranslationService: OPENAI_API_KEY missing; English fields not auto-filled');

            return array_map(fn () => '', $fields);
        }

        $payload = json_encode($fields, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            return array_map(fn () => '', $fields);
        }

        try {
            $response = Http::withToken($key)
                ->timeout(25)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'temperature' => 0.2,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You translate Arabic e-commerce catalog text to natural English for a sports/fashion store. '
                                .'Keep brand names, SKUs, sizes, and numbers unchanged. '
                                .'Return JSON only: same keys as input, values in English. No extra keys.',
                        ],
                        [
                            'role' => 'user',
                            'content' => $payload,
                        ],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('CatalogTranslationService: OpenAI error', ['status' => $response->status()]);

                return array_map(fn () => '', $fields);
            }

            $content = data_get($response->json(), 'choices.0.message.content');
            if (! is_string($content)) {
                return array_map(fn () => '', $fields);
            }

            $decoded = json_decode($content, true);
            if (! is_array($decoded)) {
                return array_map(fn () => '', $fields);
            }

            $out = [];
            foreach ($fields as $fieldKey => $arText) {
                $en = $decoded[$fieldKey] ?? '';
                $out[$fieldKey] = is_string($en) ? trim($en) : '';
                if ($out[$fieldKey] === '') {
                    $out[$fieldKey] = $arText;
                }
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('CatalogTranslationService: '.$e->getMessage());

            return array_map(fn () => '', $fields);
        }
    }
}
