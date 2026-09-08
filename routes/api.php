<?php

use App\Modules\Authentication\Controllers\AuthController;
use App\Modules\Catalog\Controllers\BrandController;
use App\Modules\Catalog\Controllers\CategoryController;
use App\Modules\Catalog\Controllers\ProductController;
use App\Modules\Customers\Controllers\CustomerNotificationController;
use App\Modules\Dashboard\Controllers\ActivityLogController;
use App\Modules\Dashboard\Controllers\DashboardController;
use App\Modules\Dashboard\Controllers\NotificationController;
use App\Modules\Dashboard\Controllers\ProfileController;
use App\Modules\Inventory\Controllers\InventoryController;
use App\Modules\Orders\Controllers\OrderController;
use App\Modules\Promotions\Controllers\CouponController;
use App\Modules\Promotions\Controllers\PromoBannerController;
use App\Modules\Settings\Controllers\MediaUploadController;
use App\Modules\Settings\Controllers\StoreSettingsController;
use App\Modules\Shipping\Controllers\ShippingMethodController;
use App\Modules\Storefront\Controllers\StorefrontController;
use App\Modules\Storefront\Controllers\StorefrontCustomerController;
use App\Modules\Staff\Controllers\MerchantRoleController;
use App\Modules\Staff\Controllers\StaffController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->controller(AuthController::class)->group(function () {
    Route::post('login', 'login');
    Route::post('register', 'register');
    Route::middleware('auth:sanctum')->post('logout', 'logout');
});

Route::middleware(['auth:sanctum', 'merchant.context'])->prefix('admin')->group(function () {
    Route::controller(ProfileController::class)->group(function () {
        Route::get('profile', 'show');
        Route::put('profile', 'update');
        Route::put('profile/password', 'updatePassword');
    });

    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->middleware('merchant.permission:dashboard.view');

    Route::controller(StoreSettingsController::class)->group(function () {
        Route::get('settings/store', 'show')->middleware('merchant.permission:settings.view');
        Route::put('settings/store', 'update')->middleware('merchant.permission:settings.update');
        Route::get('settings/legal', 'legal')->middleware('merchant.permission:settings.view');
        Route::put('settings/legal', 'updateLegal')->middleware('merchant.permission:settings.update');
        Route::get('settings/theme', 'theme')->middleware('merchant.permission:settings.view');
        Route::put('settings/theme', 'updateTheme')->middleware('merchant.permission:settings.update');
    });

    Route::post('media/upload', [MediaUploadController::class, 'store'])
        ->middleware('merchant.permission:settings.update|banners.create|banners.update|categories.create|categories.update|products.create|products.update');

    Route::controller(CategoryController::class)->group(function () {
        Route::get('categories/options', 'options')->middleware('merchant.permission:categories.view|products.view');
        Route::get('categories', 'index')->middleware('merchant.permission:categories.view');
        Route::post('categories', 'store')->middleware('merchant.permission:categories.create');
        Route::get('categories/{id}', 'show')->middleware('merchant.permission:categories.view');
        Route::put('categories/{id}', 'update')->middleware('merchant.permission:categories.update');
        Route::delete('categories/{id}', 'destroy')->middleware('merchant.permission:categories.delete');
    });

    Route::controller(BrandController::class)->group(function () {
        Route::get('brands/options', 'options')->middleware('merchant.permission:brands.view|products.view');
        Route::get('brands', 'index')->middleware('merchant.permission:brands.view');
        Route::post('brands', 'store')->middleware('merchant.permission:brands.create');
        Route::get('brands/{id}', 'show')->middleware('merchant.permission:brands.view');
        Route::put('brands/{id}', 'update')->middleware('merchant.permission:brands.update');
        Route::delete('brands/{id}', 'destroy')->middleware('merchant.permission:brands.delete');
    });

    Route::controller(ProductController::class)->group(function () {
        Route::get('products/options', 'options')->middleware('merchant.permission:products.view|orders.view');
        Route::get('products', 'index')->middleware('merchant.permission:products.view');
        Route::post('products', 'store')->middleware('merchant.permission:products.create');
        Route::get('products/{id}', 'show')->middleware('merchant.permission:products.view');
        Route::put('products/{id}', 'update')->middleware('merchant.permission:products.update');
        Route::delete('products/{id}', 'destroy')->middleware('merchant.permission:products.delete');
    });

    Route::controller(InventoryController::class)->group(function () {
        Route::get('inventory', 'index')->middleware('merchant.permission:inventory.view');
        Route::post('inventory/adjust', 'adjust')->middleware('merchant.permission:inventory.adjust');
        Route::get('inventory/movements', 'movements')->middleware('merchant.permission:inventory.movements.view');
    });

    Route::controller(CustomerController::class)->group(function () {
        Route::get('customers/options', 'options')->middleware('merchant.permission:customers.view|orders.view');
        Route::get('customers', 'index')->middleware('merchant.permission:customers.view');
        Route::post('customers', 'store')->middleware('merchant.permission:customers.create');
        Route::get('customers/{id}', 'show')->middleware('merchant.permission:customers.view');
        Route::put('customers/{id}', 'update')->middleware('merchant.permission:customers.update');
        Route::delete('customers/{id}', 'destroy')->middleware('merchant.permission:customers.delete');
        Route::post('customers/{id}/addresses', 'storeAddress')->middleware('merchant.permission:customers.update');
        Route::put('customers/{id}/addresses/{addressId}', 'updateAddress')->middleware('merchant.permission:customers.update');
        Route::delete('customers/{id}/addresses/{addressId}', 'destroyAddress')->middleware('merchant.permission:customers.update');
    });

    Route::controller(CustomerNotificationController::class)->prefix('customer-notifications')->group(function () {
        Route::get('/', 'index')->middleware('merchant.permission:customers.view');
        Route::post('/send', 'send')->middleware('merchant.permission:customers.update');
    });

    Route::controller(OrderController::class)->group(function () {
        Route::get('orders', 'index')->middleware('merchant.permission:orders.view');
        Route::post('orders', 'store')->middleware('merchant.permission:orders.update');
        Route::get('orders/{id}', 'show')->middleware('merchant.permission:orders.view');
        Route::put('orders/{id}', 'update')->middleware('merchant.permission:orders.update');
        Route::put('orders/{id}/status', 'updateStatus')->middleware('merchant.permission:orders.change_status');
        Route::delete('orders/{id}', 'destroy')->middleware('merchant.permission:orders.cancel');
    });

    Route::controller(CouponController::class)->group(function () {
        Route::get('coupons', 'index')->middleware('merchant.permission:coupons.view');
        Route::post('coupons', 'store')->middleware('merchant.permission:coupons.create');
        Route::get('coupons/{id}', 'show')->middleware('merchant.permission:coupons.view');
        Route::put('coupons/{id}', 'update')->middleware('merchant.permission:coupons.update');
        Route::delete('coupons/{id}', 'destroy')->middleware('merchant.permission:coupons.delete');
    });

    Route::controller(PromoBannerController::class)->group(function () {
        Route::get('promo-banners', 'index')->middleware('merchant.permission:banners.view');
        Route::post('promo-banners', 'store')->middleware('merchant.permission:banners.create');
        Route::get('promo-banners/{id}', 'show')->middleware('merchant.permission:banners.view');
        Route::put('promo-banners/{id}', 'update')->middleware('merchant.permission:banners.update');
        Route::delete('promo-banners/{id}', 'destroy')->middleware('merchant.permission:banners.delete');
    });

    Route::controller(ShippingMethodController::class)->group(function () {
        Route::get('shipping-methods/options', 'options')->middleware('merchant.permission:shipping.manage|orders.view');
        Route::get('shipping-methods', 'index')->middleware('merchant.permission:shipping.manage');
        Route::post('shipping-methods', 'store')->middleware('merchant.permission:shipping.manage');
        Route::get('shipping-methods/{id}', 'show')->middleware('merchant.permission:shipping.manage');
        Route::put('shipping-methods/{id}', 'update')->middleware('merchant.permission:shipping.manage');
        Route::delete('shipping-methods/{id}', 'destroy')->middleware('merchant.permission:shipping.manage');
    });

    Route::controller(StaffController::class)->group(function () {
        Route::get('staff/roles/options', 'roleOptions')->middleware('merchant.permission:staff.view|roles.manage');
        Route::get('staff', 'index')->middleware('merchant.permission:staff.view');
        Route::post('staff', 'store')->middleware('merchant.permission:staff.invite');
        Route::get('staff/{id}', 'show')->middleware('merchant.permission:staff.view');
        Route::put('staff/{id}', 'update')->middleware('merchant.permission:staff.update');
        Route::delete('staff/{id}', 'destroy')->middleware('merchant.permission:staff.remove');
    });

    Route::controller(MerchantRoleController::class)->group(function () {
        Route::get('roles', 'index')->middleware('merchant.permission:roles.manage');
        Route::post('roles', 'store')->middleware('merchant.permission:roles.manage');
        Route::get('roles/{id}', 'show')->middleware('merchant.permission:roles.manage');
        Route::put('roles/{id}', 'update')->middleware('merchant.permission:roles.manage');
        Route::delete('roles/{id}', 'destroy')->middleware('merchant.permission:roles.manage');
        Route::get('permissions/options', 'permissionOptions')->middleware('merchant.permission:roles.manage');
    });

    Route::controller(NotificationController::class)->group(function () {
        Route::get('notifications/unread-count', 'unreadCount');
        Route::post('notifications/read-all', 'markAllRead');
        Route::post('notifications/{id}/read', 'markRead');
        Route::get('notifications', 'index');
    });

    Route::get('activity-logs', [ActivityLogController::class, 'index'])->middleware('merchant.permission:activity_logs.view');
});

Route::middleware('store.context')->prefix('store')->group(function () {
    Route::controller(StorefrontController::class)->group(function () {
        Route::get('/', 'storeInfo');
        Route::get('theme', 'theme');
        Route::get('categories', 'categories');
        Route::get('promo-banners', 'promoBanners');
        Route::get('products', 'products');
        Route::get('products/{id}', 'productShow');
        Route::get('shipping-methods', 'shippingMethods');
        Route::get('legal', 'legal');
    });

    Route::controller(StorefrontCustomerController::class)->prefix('customer')->group(function () {
        Route::post('register', 'register');
        Route::post('login', 'login');
        Route::middleware('store.customer')->group(function () {
            Route::get('profile', 'profile');
            Route::put('profile', 'updateProfile');
            Route::get('orders', 'orders');
            Route::post('orders', 'storeOrder');
            Route::get('notifications', 'notifications');
            Route::get('notifications/unread-count', 'unreadNotificationsCount');
            Route::post('notifications/read-all', 'markAllNotificationsRead');
            Route::post('notifications/{id}/read', 'markNotificationRead');
            Route::post('addresses', 'storeAddress');
            Route::put('addresses/{addressId}', 'updateAddress');
            Route::delete('addresses/{addressId}', 'destroyAddress');
        });
    });
});
