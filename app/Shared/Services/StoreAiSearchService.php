<?php

namespace App\Shared\Services;

use App\Modules\Catalog\Models\Product;
use App\Shared\Helpers\MoneyHelper;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class StoreAiSearchService
{
    /** @var list<string> */
    protected array $stopWords = [
        'في', 'من', 'على', 'الى', 'إلى', 'عن', 'مع', 'this', 'that', 'the', 'for', 'and', 'or', 'a', 'an',
        'بدي', 'ابغى', 'أبغى', 'product', 'منتج', 'منتجات',
    ];

    /**
     * @return array{keywords: list<string>, summary: string, ai_used: bool}
     */
    public function analyzeQuery(string $query, string $locale = 'ar'): array
    {
        $query = trim($query);
        if ($query === '') {
            return ['keywords' => [], 'summary' => '', 'ai_used' => false];
        }

        $key = config('services.openai.key');
        if ($key) {
            $parsed = $this->analyzeWithOpenAi($query, $locale, $key);
            if ($parsed !== null) {
                return $parsed;
            }
        }

        return [
            'keywords' => $this->heuristicKeywords($query),
            'summary' => $locale === 'ar'
                ? 'بحث ذكي بالكلمات: '.implode('، ', $this->heuristicKeywords($query))
                : 'Smart search keywords: '.implode(', ', $this->heuristicKeywords($query)),
            'ai_used' => false,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function searchProducts(string $query, int $limit = 24, string $locale = 'ar'): array
    {
        $analysis = $this->analyzeQuery($query, $locale);
        $keywords = $analysis['keywords'];
        if ($keywords === []) {
            return ['analysis' => $analysis, 'products' => []];
        }

        $builder = Product::query()
            ->with([
                'category:id,name',
                'defaultVariant.inventory',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->limit(1),
            ])
            ->where('status', 'active');

        $builder->where(function ($q) use ($keywords) {
            foreach ($keywords as $word) {
                $like = '%'.$word.'%';
                $q->orWhere('name', 'like', $like)
                    ->orWhere('short_description', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like));
            }
        });

        $products = $builder->orderByDesc('featured')->orderByDesc('id')->limit($limit)->get();

        return [
            'analysis' => $analysis,
            'products' => $products->map(fn (Product $p) => $this->formatProduct($p))->all(),
        ];
    }

    /**
     * @return list<string>
     */
    protected function heuristicKeywords(string $query): array
    {
        $normalized = Str::lower(preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $query) ?? $query);
        $parts = preg_split('/\s+/u', trim($normalized), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $keywords = [];
        foreach ($parts as $part) {
            if (mb_strlen($part) < 2) {
                continue;
            }
            if (in_array($part, $this->stopWords, true)) {
                continue;
            }
            $keywords[] = $part;
        }

        if ($keywords === [] && trim($query) !== '') {
            $keywords[] = trim($query);
        }

        return array_values(array_unique($keywords));
    }

    /**
     * @return array{keywords: list<string>, summary: string, ai_used: bool}|null
     */
    protected function analyzeWithOpenAi(string $query, string $locale, string $apiKey): ?array
    {
        try {
            $response = Http::withToken($apiKey)
                ->timeout(12)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'temperature' => 0.2,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You help a grocery/fashion store search. Return JSON only: {"keywords":["word1","word2"],"summary":"one short sentence in user language"}',
                        ],
                        [
                            'role' => 'user',
                            'content' => 'Locale: '.$locale.'. Query: '.$query,
                        ],
                    ],
                ]);

            if (! $response->successful()) {
                return null;
            }

            $content = data_get($response->json(), 'choices.0.message.content');
            if (! is_string($content)) {
                return null;
            }

            /** @var array{keywords?: array<int, string>, summary?: string} $data */
            $data = json_decode($content, true);
            if (! is_array($data)) {
                return null;
            }

            $keywords = array_values(array_filter(array_map(
                fn ($k) => trim((string) $k),
                $data['keywords'] ?? [],
            )));

            if ($keywords === []) {
                $keywords = $this->heuristicKeywords($query);
            }

            return [
                'keywords' => $keywords,
                'summary' => (string) ($data['summary'] ?? ''),
                'ai_used' => true,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /** @return array<string, mixed> */
    protected function formatProduct(Product $product): array
    {
        $variant = $product->defaultVariant;
        $inventory = $variant?->inventory;
        $image = $product->images->first();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'short_description' => $product->short_description,
            'featured' => $product->featured,
            'category_id' => $product->category_id,
            'category_name' => $product->category?->name,
            'price' => MoneyHelper::fromMinor($variant?->price_amount),
            'compare_at_price' => MoneyHelper::fromMinor($variant?->compare_at_price_amount),
            'variant_id' => $variant?->id,
            'in_stock' => ($inventory?->quantity ?? 0) > 0,
            'image' => $image?->file_path,
        ];
    }
}
