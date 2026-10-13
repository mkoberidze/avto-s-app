<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use App\Models\TranslationCache;
use App\Support\RateLimited;
use App\Support\Translator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CatalogTranslate extends Command
{
    protected $signature = 'catalog:translate
        {--lang= : Comma-separated languages (default all configured)}
        {--limit=60 : Max field translations this run (0 = unlimited)}
        {--fields=name,short_description,features,description : Fields in priority order}
        {--product= : Product id}
        {--category : Translate categories only}
        {--dry-run : Call the API but do not save}
        {--force : Re-translate non-manual fields even when the hash matches}
        {--estimate : Count pending work, no API}
        {--probe : Probe Groq models and sample translations}';

    protected $description = 'Translate catalog Georgian content to EN/RU via Groq';

    private Translator $translator;

    private int $requests = 0;

    private int $tokensUsed = 0;

    private int $cacheHits = 0;

    private int $cacheMisses = 0;

    private int $skipped = 0;

    private int $failed = 0;

    private array $translated = [];

    private ?string $pausedUntil = null;

    private bool $didRequest = false;

    public function handle(Translator $translator): int
    {
        $this->translator = $translator;

        if ($this->option('probe')) {
            return $this->probe();
        }

        if ($this->option('estimate')) {
            return $this->estimate();
        }

        if (! config('translation.enabled')) {
            $this->warn('TRANSLATION_ENABLED is false.');

            return self::SUCCESS;
        }
        if (! config('translation.api_key')) {
            $this->error('GROQ_API_KEY is missing.');

            return self::FAILURE;
        }

        $paused = Cache::get('translation:paused_until');
        if ($paused && now()->lt($paused)) {
            $this->warn('Translation is paused until '.$paused.'.');

            return self::SUCCESS;
        }

        $lock = Cache::lock('catalog:translate', 900);
        if (! $lock->get()) {
            $this->warn('Another catalog:translate run is in progress.');

            return self::SUCCESS;
        }

        $started = microtime(true);
        try {
            if ($this->overBudget()) {
                $this->warn('Daily token budget reached.');
            } else {
                $this->runTranslate();
            }
        } catch (RateLimited $e) {
            $until = now()->addSeconds(max(60, $e->retryAfter));
            Cache::put('translation:paused_until', $until, $until);
            $this->pausedUntil = $until->toDateTimeString();
            $this->warn('Rate limited. Paused until '.$this->pausedUntil);
        } finally {
            $lock->release();
        }

        $this->printSummary(microtime(true) - $started);

        return self::SUCCESS;
    }

    private function runTranslate(): void
    {
        $langs = $this->langs();
        $fields = $this->fields();
        $limit = $this->limit();
        $force = (bool) $this->option('force');
        $dry = (bool) $this->option('dry-run');
        $productId = $this->option('product');

        if ($this->option('category')) {
            $this->translateCategories($langs, $limit, $force, $dry);

            return;
        }

        $jobs = $this->collectProductJobs($langs, $fields, $limit, $force, $productId);
        $this->processJobs($jobs, $dry);
    }

    private function collectProductJobs(array $langs, array $fields, int $limit, bool $force, mixed $productId): array
    {
        $query = Product::query()->visible()->orderByDesc('first_seen_at')->orderByDesc('id');
        if ($productId) {
            $query->where('id', (int) $productId);
        }
        $products = $query->get();
        $jobs = [];
        foreach ($fields as $field) {
            foreach ($products as $product) {
                foreach ($langs as $lang) {
                    if (! $product->needsTranslation($lang, $field, $force)) {
                        continue;
                    }
                    $jobs[] = ['product' => $product, 'lang' => $lang, 'field' => $field];
                    if ($limit > 0 && count($jobs) >= $limit) {
                        return $jobs;
                    }
                }
            }
        }

        return $jobs;
    }

    private function processJobs(array $jobs, bool $dry): void
    {
        $groups = [];
        foreach ($jobs as $job) {
            $groups[$job['lang'].':'.$job['field']][] = $job;
        }
        foreach ($groups as $jobsInGroup) {
            if ($this->overBudget()) {
                $this->warn('Daily token budget reached.');

                return;
            }
            $field = $jobsInGroup[0]['field'];
            $lang = $jobsInGroup[0]['lang'];
            if ($field === 'features') {
                $this->translateFeatureJobs($jobsInGroup, $lang, $dry);
            } else {
                $this->translateTextJobs($jobsInGroup, $lang, $field, $dry);
            }
        }
    }

    private function translateTextJobs(array $jobs, string $lang, string $field, bool $dry): void
    {
        $items = [];
        $map = [];
        foreach ($jobs as $i => $job) {
            /** @var Product $product */
            $product = $job['product'];
            $source = (string) $product->fieldSource($field);
            if ($this->passthrough($source)) {
                $this->saveProductField($product, $lang, $field, $source, $dry);
                $this->skipped++;
                continue;
            }
            if (mb_strlen($source) > (int) config('translation.max_field_chars')) {
                Log::info('Translation skipped oversized field', ['product_id' => $product->id, 'field' => $field]);
                $this->skipped++;
                continue;
            }
            $id = (string) $product->id.':'.$field;
            $items[] = ['id' => $id, 'text' => $source, 'html' => in_array($field, ['short_description', 'description'], true)];
            $map[$id] = $job;
        }
        foreach ($this->chunkItems($items) as $chunk) {
            if ($this->overBudget()) {
                $this->warn('Daily token budget reached.');

                return;
            }
            $result = $this->callApi($chunk, $lang);
            foreach ($chunk as $item) {
                $job = $map[$item['id']];
                $product = $job['product'];
                $text = $result['texts'][$item['id']] ?? null;
                if (! is_string($text) || ! $this->validTranslation($item['text'], $text, $item['html'])) {
                    $this->failed++;
                    Log::info('Translation validation failed', ['product_id' => $product->id, 'field' => $field]);
                    continue;
                }
                if ($dry) {
                    $this->line($product->id.' ['.$lang.'/'.$field.']');
                    $this->line('  source: '.$this->clip($item['text']));
                    $this->line('  translated: '.$this->clip($text));
                    $this->bumpTranslated($lang, $field);
                    continue;
                }
                $this->saveProductField($product, $lang, $field, $text, false);
                $this->bumpTranslated($lang, $field);
            }
        }
    }

    private function translateFeatureJobs(array $jobs, string $lang, bool $dry): void
    {
        $pending = [];
        foreach ($jobs as $job) {
            /** @var Product $product */
            $product = $job['product'];
            $features = $product->fieldSource('features');
            if (! is_array($features) || $features === []) {
                $this->skipped++;
                continue;
            }
            $strings = [];
            foreach ($features as $key => $value) {
                $strings[] = (string) $key;
                $strings[] = is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            $strings = array_values(array_unique($strings));
            $resolved = [];
            $need = [];
            foreach ($strings as $string) {
                if ($this->passthrough($string)) {
                    $resolved[$string] = $string;
                    continue;
                }
                $hit = $this->cacheGet($string, $lang);
                if ($hit !== null) {
                    $resolved[$string] = $hit;
                    $this->cacheHits++;
                    continue;
                }
                $need[] = $string;
                $this->cacheMisses++;
            }
            $pending[] = compact('product', 'features', 'resolved', 'need');
        }

        $toSend = [];
        foreach ($pending as $row) {
            foreach ($row['need'] as $string) {
                if (mb_strlen($string) > (int) config('translation.max_field_chars')) {
                    continue;
                }
                $toSend[$string] = $string;
            }
        }
        $apiItems = [];
        $i = 0;
        foreach (array_values($toSend) as $string) {
            $apiItems[] = ['id' => 'f'.$i, 'text' => $string, 'html' => false];
            $i++;
        }
        $translatedStrings = [];
        foreach ($this->chunkItems($apiItems) as $chunk) {
            if ($this->overBudget()) {
                $this->warn('Daily token budget reached.');

                return;
            }
            $result = $this->callApi($chunk, $lang);
            foreach ($chunk as $item) {
                $source = $item['text'];
                $text = $result['texts'][$item['id']] ?? null;
                if (! is_string($text) || ! $this->validTranslation($source, $text, false)) {
                    $this->failed++;
                    continue;
                }
                $translatedStrings[$source] = $text;
                if (! $dry && mb_strlen($source) <= 200) {
                    $this->cachePut($source, $lang, $text);
                }
            }
        }

        foreach ($pending as $row) {
            $product = $row['product'];
            $map = $row['resolved'] + $translatedStrings;
            $out = [];
            $ok = true;
            foreach ($row['features'] as $key => $value) {
                $k = (string) $key;
                $v = is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE);
                if (! isset($map[$k], $map[$v])) {
                    $ok = false;
                    break;
                }
                $out[$map[$k]] = $map[$v];
            }
            if (! $ok) {
                $this->failed++;
                Log::info('Translation validation failed', ['product_id' => $product->id, 'field' => 'features']);
                continue;
            }
            if ($dry) {
                $this->line($product->id.' ['.$lang.'/features] '.json_encode($out, JSON_UNESCAPED_UNICODE));
                $this->bumpTranslated($lang, 'features');
                continue;
            }
            $this->saveProductField($product, $lang, 'features', $out, false);
            $this->bumpTranslated($lang, 'features');
        }
    }

    private function translateCategories(array $langs, int $limit, bool $force, bool $dry): void
    {
        $jobs = [];
        $categories = Category::query()->orderBy('id')->get();
        foreach ($categories as $category) {
            foreach ($langs as $lang) {
                $manual = data_get($category->translations, "{$lang}._manual", []);
                if (is_array($manual) && in_array('name', $manual, true)) {
                    continue;
                }
                $current = data_get($category->translations, "{$lang}.name");
                $hash = data_get($category->translations, "{$lang}._h.name");
                $source = (string) $category->name_ka;
                $needs = $force || ! is_string($current) || $current === '' || $hash !== md5($source);
                if (! $needs) {
                    continue;
                }
                $jobs[] = compact('category', 'lang', 'source');
                if ($limit > 0 && count($jobs) >= $limit) {
                    break 2;
                }
            }
        }
        $byLang = [];
        foreach ($jobs as $job) {
            $byLang[$job['lang']][] = $job;
        }
        foreach ($byLang as $lang => $langJobs) {
            $items = [];
            $map = [];
            foreach ($langJobs as $job) {
                $source = $job['source'];
                if ($this->passthrough($source)) {
                    $this->saveCategoryName($job['category'], $job['lang'], $source, $dry);
                    $this->skipped++;
                    continue;
                }
                $id = 'c'.$job['category']->id;
                $items[] = ['id' => $id, 'text' => $source, 'html' => false];
                $map[$id] = $job;
            }
            foreach ($this->chunkItems($items) as $chunk) {
                if ($this->overBudget()) {
                    $this->warn('Daily token budget reached.');

                    return;
                }
                $result = $this->callApi($chunk, $lang);
                foreach ($chunk as $item) {
                    $job = $map[$item['id']];
                    $text = $result['texts'][$item['id']] ?? null;
                    if (! is_string($text) || ! $this->validTranslation($item['text'], $text, false)) {
                        $this->failed++;
                        continue;
                    }
                    if ($dry) {
                        $this->line('category '.$job['category']->id.' ['.$job['lang'].'] '.$this->clip($text));
                        $this->bumpTranslated($job['lang'], 'category_name');
                        continue;
                    }
                    $this->saveCategoryName($job['category'], $job['lang'], $text, false);
                    $this->bumpTranslated($job['lang'], 'category_name');
                }
            }
        }
    }

    private function callApi(array $chunk, string $lang): array
    {
        if ($chunk === []) {
            return ['texts' => [], 'tokens' => 0];
        }
        if ($this->didRequest) {
            usleep(max(0, (int) config('translation.request_interval_ms')) * 1000);
        }
        $this->didRequest = true;
        $this->requests++;
        $result = $this->translator->translateBatch($chunk, $lang);
        $this->addTokens((int) ($result['tokens'] ?? 0));
        $this->tokensUsed += (int) ($result['tokens'] ?? 0);

        return $result;
    }

    private function chunkItems(array $items): array
    {
        $maxItems = max(1, (int) config('translation.batch_max_items'));
        $maxChars = max(1, (int) config('translation.batch_max_chars'));
        $chunks = [];
        $current = [];
        $chars = 0;
        foreach ($items as $item) {
            $len = mb_strlen($item['text']);
            if ($current !== [] && (count($current) >= $maxItems || $chars + $len > $maxChars)) {
                $chunks[] = $current;
                $current = [];
                $chars = 0;
            }
            $current[] = $item;
            $chars += $len;
        }
        if ($current !== []) {
            $chunks[] = $current;
        }

        return $chunks;
    }

    private function passthrough(string $text): bool
    {
        $trim = trim($text);
        if ($trim === '') {
            return true;
        }
        if (preg_match('/^-?\d+([.,]\d+)?$/', $trim)) {
            return true;
        }
        if (! preg_match('/[\x{10A0}-\x{10FF}]/u', $text)) {
            return true;
        }

        return false;
    }

    private function validTranslation(string $source, string $translated, bool $html): bool
    {
        if (trim($translated) === '') {
            return false;
        }
        if (preg_match('/[\x{10A0}-\x{10FF}]/u', $source) && $translated === $source) {
            return false;
        }
        if (preg_match_all('/[A-Za-z0-9][A-Za-z0-9._\/+-]*[0-9][A-Za-z0-9._\/+-]*/', $source, $matches)) {
            foreach (array_unique($matches[0]) as $token) {
                if (! str_contains($translated, $token)) {
                    return false;
                }
            }
        }
        if ($html && $this->tagNames($source) !== $this->tagNames($translated)) {
            return false;
        }

        return true;
    }

    private function tagNames(string $html): array
    {
        preg_match_all('/<\/?([A-Za-z][A-Za-z0-9]*)\b[^>]*>/', $html, $matches);

        return array_map('strtolower', $matches[1] ?? []);
    }

    private function saveProductField(Product $product, string $lang, string $field, mixed $value, bool $dry): void
    {
        if ($dry) {
            return;
        }
        DB::transaction(function () use ($product, $lang, $field, $value) {
            $fresh = Product::query()->lockForUpdate()->find($product->id);
            if (! $fresh || $fresh->isManual($lang, $field)) {
                return;
            }
            $fresh->writeTranslation($lang, $field, $value);
            $fresh->save();
            $product->translations = $fresh->translations;
            $product->name_en = $fresh->name_en;
            $product->name_ru = $fresh->name_ru;
        });
    }

    private function saveCategoryName(Category $category, string $lang, string $value, bool $dry): void
    {
        if ($dry) {
            return;
        }
        $translations = $category->translations ?? [];
        $translations[$lang]['name'] = $value;
        $translations[$lang]['_h']['name'] = md5((string) $category->name_ka);
        $category->translations = $translations;
        $category->save();
    }

    private function cacheGet(string $source, string $lang): ?string
    {
        $row = TranslationCache::query()
            ->where('source_hash', md5($source))
            ->where('lang', $lang)
            ->first();

        return $row?->translated_text;
    }

    private function cachePut(string $source, string $lang, string $translated): void
    {
        TranslationCache::query()->updateOrCreate(
            ['source_hash' => md5($source), 'lang' => $lang],
            ['source_text' => $source, 'translated_text' => $translated]
        );
    }

    private function langs(): array
    {
        $raw = $this->option('lang');
        $configured = array_keys(config('translation.languages', ['en' => 'English', 'ru' => 'Russian']));
        if (! $raw) {
            return $configured;
        }

        return array_values(array_filter(array_map('trim', explode(',', (string) $raw)), fn ($lang) => in_array($lang, $configured, true)));
    }

    private function fields(): array
    {
        $all = Product::TRANSLATABLE;
        $raw = (string) $this->option('fields');
        $chosen = array_values(array_filter(array_map('trim', explode(',', $raw))));

        return array_values(array_filter($all, fn ($field) => in_array($field, $chosen, true)));
    }

    private function limit(): int
    {
        if ($this->option('dry-run') && ! $this->input->hasParameterOption('--limit')) {
            return 5;
        }

        return (int) $this->option('limit');
    }

    private function tokenKey(): string
    {
        return 'translation:tokens:'.now()->toDateString();
    }

    private function todayTokens(): int
    {
        return (int) Cache::get($this->tokenKey(), 0);
    }

    private function addTokens(int $tokens): void
    {
        if ($tokens <= 0) {
            return;
        }
        Cache::put($this->tokenKey(), $this->todayTokens() + $tokens, now()->addDays(2));
    }

    private function overBudget(): bool
    {
        $budget = (int) config('translation.daily_token_budget');

        return $budget > 0 && $this->todayTokens() >= $budget;
    }

    private function bumpTranslated(string $lang, string $field): void
    {
        $this->translated[$lang][$field] = ($this->translated[$lang][$field] ?? 0) + 1;
    }

    private function clip(string $text): string
    {
        $flat = preg_replace('/\s+/', ' ', $text) ?? $text;

        return mb_strlen($flat) > 180 ? mb_substr($flat, 0, 180).'…' : $flat;
    }

    private function estimate(): int
    {
        $langs = $this->langs();
        $fields = $this->fields();
        $force = (bool) $this->option('force');
        $charsPer = max(0.1, (float) config('translation.chars_per_token'));
        $this->line('Today tokens: '.$this->todayTokens().' / budget '.config('translation.daily_token_budget'));
        foreach ($langs as $lang) {
            foreach ($fields as $field) {
                $count = 0;
                $chars = 0;
                Product::query()->visible()->orderByDesc('id')->chunkById(100, function ($products) use ($lang, $field, $force, &$count, &$chars) {
                    foreach ($products as $product) {
                        if (! $product->needsTranslation($lang, $field, $force)) {
                            continue;
                        }
                        $source = $product->fieldSource($field);
                        if ($field === 'features') {
                            $json = json_encode($source, JSON_UNESCAPED_UNICODE) ?: '';
                            if ($this->passthrough($json)) {
                                continue;
                            }
                            $chars += mb_strlen($json);
                        } else {
                            $text = (string) $source;
                            if ($this->passthrough($text)) {
                                continue;
                            }
                            $chars += mb_strlen($text);
                        }
                        $count++;
                    }
                });
                $tokensIn = (int) ceil($chars / $charsPer);
                $requests = $count === 0 ? 0 : (int) ceil($count / max(1, (int) config('translation.batch_max_items')));
                $this->line(sprintf(
                    '%s/%s pending=%d chars=%d est_tokens_in=%d est_tokens_out≈%d requests≈%d',
                    $lang,
                    $field,
                    $count,
                    $chars,
                    $tokensIn,
                    $tokensIn,
                    $requests
                ));
            }
        }

        return self::SUCCESS;
    }

    private function probe(): int
    {
        if (! config('translation.api_key')) {
            $this->error('GROQ_API_KEY is missing.');

            return self::FAILURE;
        }
        $models = $this->translator->listModels();
        $this->line('Models ('.count($models['ids']).'): '.implode(', ', array_slice($models['ids'], 0, 40)));
        if ($models['headers']) {
            $this->line('model-list headers: '.json_encode($models['headers']));
        }
        $samples = [
            ['id' => 'name', 'text' => 'სახანძრო პანელი DS-2CD2043 4MP', 'html' => false],
            ['id' => 'html', 'text' => '<p>ეს არის <b>დეტექტორი</b> ობიექტისთვის.</p>', 'html' => true],
            ['id' => 'feat', 'text' => 'რეზოლუცია: 4MP', 'html' => false],
        ];
        foreach (array_keys(config('translation.languages')) as $lang) {
            $this->line('--- '.$lang.' ---');
            $result = $this->translator->translateBatch($samples, $lang);
            $this->line('raw: '.$this->clip((string) ($result['raw'] ?? '')));
            $this->line('parsed: '.json_encode($result['texts'], JSON_UNESCAPED_UNICODE));
            $this->line('tokens: '.$result['tokens']);
            $sent = 0;
            foreach ($samples as $sample) {
                $sent += mb_strlen($sample['text']);
            }
            $this->line('chars_sent: '.$sent);
            if (! empty($result['headers'])) {
                $this->line('headers: '.json_encode($result['headers']));
            }
        }

        return self::SUCCESS;
    }

    private function printSummary(float $seconds): void
    {
        $this->line('translated: '.json_encode($this->translated));
        $this->line('skipped: '.$this->skipped);
        $this->line('failed: '.$this->failed);
        $this->line('cache hits: '.$this->cacheHits.' misses: '.$this->cacheMisses);
        $this->line('requests: '.$this->requests);
        $this->line('tokens this run: '.$this->tokensUsed);
        $this->line('tokens today: '.$this->todayTokens());
        $this->line(sprintf('duration: %.2fs', $seconds));
        if ($this->pausedUntil) {
            $this->line('paused-until: '.$this->pausedUntil);
        }
    }
}
