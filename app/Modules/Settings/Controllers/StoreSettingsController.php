<?php

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Merchants\Models\Merchant;
use App\Modules\Merchants\Models\Store;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\StoreSettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StoreSettingsController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function show()
    {
        $merchant = MerchantContext::merchant()?->load('store');

        if (! $merchant) {
            return sendError('Merchant not found', [], 404);
        }

        $storeId = $merchant->store?->id;

        return sendResponse([
            'merchant' => [
                'business_name' => $merchant->business_name,
                'legal_name' => $merchant->legal_name,
                'email' => $merchant->email,
                'phone' => $merchant->phone,
                'country_code' => $merchant->country_code,
                'currency' => $merchant->currency,
                'currency_symbol' => $storeId ? StoreSettingService::getCurrencySymbol($storeId) : StoreSettingService::defaultCurrencySymbol(),
                'timezone' => $merchant->timezone,
                'default_language' => $merchant->default_language,
                'commercial_registration_number' => $merchant->commercial_registration_number,
                'tax_number' => $merchant->tax_number,
            ],
            'store' => $merchant->store ? [
                'name' => $merchant->store->name,
                'description' => $merchant->store->description,
                'logo' => $merchant->store->logo,
                'email' => $merchant->store->email,
                'phone' => $merchant->store->phone,
                'country_code' => $merchant->store->country_code,
                'currency' => $merchant->store->currency,
                'timezone' => $merchant->store->timezone,
                'default_language' => $merchant->store->default_language,
            ] : null,
        ], 'Store settings fetched');
    }

    public function update(Request $request)
    {
        $merchant = MerchantContext::merchant()?->load('store');

        if (! $merchant || ! $merchant->store) {
            return sendError('Store not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'business_name' => 'sometimes|required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'country_code' => 'nullable|string|max:5',
            'currency' => 'nullable|string|max:5',
            'currency_symbol' => 'nullable|string|max:12',
            'timezone' => 'nullable|string|max:64',
            'default_language' => 'nullable|string|max:5',
            'commercial_registration_number' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'store_name' => 'sometimes|required|string|max:255',
            'store_description' => 'nullable|string',
            'store_logo' => 'nullable|string|max:500',
            'store_email' => 'nullable|email|max:255',
            'store_phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        $merchant->update(array_filter([
            'business_name' => $data['business_name'] ?? null,
            'legal_name' => $data['legal_name'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'country_code' => $data['country_code'] ?? null,
            'currency' => $data['currency'] ?? null,
            'timezone' => $data['timezone'] ?? null,
            'default_language' => $data['default_language'] ?? null,
            'commercial_registration_number' => $data['commercial_registration_number'] ?? null,
            'tax_number' => $data['tax_number'] ?? null,
        ], fn ($v) => $v !== null));

        $merchant->store->update(array_filter([
            'name' => $data['store_name'] ?? null,
            'description' => $data['store_description'] ?? null,
            'logo' => $data['store_logo'] ?? null,
            'email' => $data['store_email'] ?? null,
            'phone' => $data['store_phone'] ?? null,
            'country_code' => $data['country_code'] ?? null,
            'currency' => $data['currency'] ?? null,
            'timezone' => $data['timezone'] ?? null,
            'default_language' => $data['default_language'] ?? null,
        ], fn ($v) => $v !== null));

        if (array_key_exists('currency_symbol', $data)) {
            StoreSettingService::setCurrencySymbol($merchant->store->id, $data['currency_symbol']);
        }

        $this->activityLog->log('settings.updated', 'settings', 'Store settings updated', Store::class, $merchant->store->id, request: $request);

        return sendResponse([], 'Store settings updated');
    }

    public function legal()
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        return sendResponse(StoreSettingService::getLegal($store->id), 'Legal settings fetched');
    }

    public function updateLegal(Request $request)
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'terms_ar' => 'nullable|string',
            'terms_en' => 'nullable|string',
            'privacy_ar' => 'nullable|string',
            'privacy_en' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        foreach ($validator->validated() as $key => $value) {
            StoreSettingService::set($store->id, $key, $value, true, 'legal');
        }

        $this->activityLog->log('settings.legal_updated', 'settings', 'Legal content updated', Store::class, $store->id, request: $request);

        return sendResponse(StoreSettingService::getLegal($store->id), 'Legal settings updated');
    }

    public function theme()
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        return sendResponse(StoreSettingService::getTheme($store->id), 'Theme settings fetched');
    }

    public function updateTheme(Request $request)
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'primary' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'background' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'foreground' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'accent' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        StoreSettingService::setTheme($store->id, $validator->validated());

        $this->activityLog->log('settings.theme_updated', 'settings', 'Store theme updated', Store::class, $store->id, request: $request);

        return sendResponse(StoreSettingService::getTheme($store->id), 'Theme settings updated');
    }

    public function social()
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        return sendResponse(StoreSettingService::getSocial($store->id), 'Social links fetched');
    }

    public function updateSocial(Request $request)
    {
        $store = MerchantContext::merchant()?->store;
        if (! $store) {
            return sendError('Store not found', [], 404);
        }

        $keys = array_keys(StoreSettingService::socialKeys());
        $rules = collect($keys)->mapWithKeys(fn ($k) => [$k => 'nullable|string|max:500'])->all();

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        StoreSettingService::setSocial($store->id, $validator->validated());

        $this->activityLog->log('settings.social_updated', 'settings', 'Social links updated', Store::class, $store->id, request: $request);

        return sendResponse(StoreSettingService::getSocial($store->id), 'Social links updated');
    }
}
