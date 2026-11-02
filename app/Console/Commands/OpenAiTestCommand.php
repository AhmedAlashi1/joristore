<?php

namespace App\Console\Commands;

use App\Shared\Services\CatalogTranslationService;
use Illuminate\Console\Command;

class OpenAiTestCommand extends Command
{
    protected $signature = 'openai:test {--text=قميص رياضي : Arabic sample to translate}';

    protected $description = 'Test OpenAI catalog translation from the server (key, billing, SSL)';

    public function handle(CatalogTranslationService $translation): int
    {
        $probe = $translation->probeTranslation((string) $this->option('text'));

        $this->line('OPENAI_API_KEY configured: '.($probe['configured'] ? 'yes' : 'no'));

        if ($probe['sample_en']) {
            $this->info('Translation OK: '.$probe['sample_en']);

            return self::SUCCESS;
        }

        $this->error($probe['message'] ?? 'Translation failed');
        if ($probe['http_status']) {
            $this->line('HTTP status: '.$probe['http_status']);
        }
        if ($probe['openai_code']) {
            $this->line('OpenAI code: '.$probe['openai_code']);
        }

        return self::FAILURE;
    }
}
