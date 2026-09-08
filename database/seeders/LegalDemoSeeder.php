<?php

namespace Database\Seeders;

use App\Modules\Merchants\Models\Merchant;
use App\Shared\Services\StoreSettingService;
use Illuminate\Database\Seeder;

class LegalDemoSeeder extends Seeder
{
    public function run(): void
    {
        $merchant = Merchant::query()->where('slug', 'jori-store')->first();
        if (! $merchant?->store) {
            return;
        }

        $storeId = $merchant->store->id;

        if (StoreSettingService::get($storeId, 'terms_ar')) {
            $this->command?->info('Legal content already exists — skipping.');

            return;
        }

        StoreSettingService::set($storeId, 'terms_ar', $this->termsAr(), true, 'legal');
        StoreSettingService::set($storeId, 'terms_en', $this->termsEn(), true, 'legal');
        StoreSettingService::set($storeId, 'privacy_ar', $this->privacyAr(), true, 'legal');
        StoreSettingService::set($storeId, 'privacy_en', $this->privacyEn(), true, 'legal');

        $this->command?->info('Legal demo content seeded.');
    }

    private function termsAr(): string
    {
        return <<<'TXT'
# الشروط والأحكام

مرحباً بك في Jori Store. باستخدامك للتطبيق فإنك توافق على:

1. **الاستخدام** — التطبيق مخصص للتسوق الشخصي فقط.
2. **الطلبات** — جميع الأسعار بالريال السعودي وقد تتغير دون إشعار.
3. **الدفع** — الدفع عند الاستلام متاح حالياً.
4. **الإرجاع** — يمكن طلب الإرجاع خلال 7 أيام للمنتجات غير المستخدمة.
5. **الخصوصية** — نحترم بياناتك ولا نشاركها مع أطراف ثالثة.

للاستفسارات تواصل معنا عبر صفحة حسابي.
TXT;
    }

    private function termsEn(): string
    {
        return <<<'TXT'
# Terms & Conditions

Welcome to Jori Store. By using this app you agree to:

1. **Use** — For personal shopping only.
2. **Orders** — Prices in SAR and may change without notice.
3. **Payment** — Cash on delivery is currently available.
4. **Returns** — Returns within 7 days for unused items.
5. **Privacy** — We respect your data and do not share it with third parties.
TXT;
    }

    private function privacyAr(): string
    {
        return 'نحن نجمع بيانات الحساب (الاسم، الجوال، العناوين) لتقديم خدمة التوصيل وإتمام الطلبات فقط.';
    }

    private function privacyEn(): string
    {
        return 'We collect account data (name, phone, addresses) only to fulfill orders and delivery.';
    }
}
