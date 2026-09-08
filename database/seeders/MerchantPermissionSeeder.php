<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class MerchantPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            ['key' => 'dashboard.view', 'name' => 'View Dashboard', 'module' => 'dashboard'],
            ['key' => 'reports.view', 'name' => 'View Reports', 'module' => 'dashboard'],

            ['key' => 'products.view', 'name' => 'View Products', 'module' => 'products'],
            ['key' => 'products.create', 'name' => 'Create Products', 'module' => 'products'],
            ['key' => 'products.update', 'name' => 'Update Products', 'module' => 'products'],
            ['key' => 'products.delete', 'name' => 'Delete Products', 'module' => 'products'],
            ['key' => 'products.publish', 'name' => 'Publish Products', 'module' => 'products'],

            ['key' => 'categories.view', 'name' => 'View Categories', 'module' => 'categories'],
            ['key' => 'categories.create', 'name' => 'Create Categories', 'module' => 'categories'],
            ['key' => 'categories.update', 'name' => 'Update Categories', 'module' => 'categories'],
            ['key' => 'categories.delete', 'name' => 'Delete Categories', 'module' => 'categories'],

            ['key' => 'brands.view', 'name' => 'View Brands', 'module' => 'brands'],
            ['key' => 'brands.create', 'name' => 'Create Brands', 'module' => 'brands'],
            ['key' => 'brands.update', 'name' => 'Update Brands', 'module' => 'brands'],
            ['key' => 'brands.delete', 'name' => 'Delete Brands', 'module' => 'brands'],

            ['key' => 'inventory.view', 'name' => 'View Inventory', 'module' => 'inventory'],
            ['key' => 'inventory.adjust', 'name' => 'Adjust Inventory', 'module' => 'inventory'],
            ['key' => 'inventory.movements.view', 'name' => 'View Inventory Movements', 'module' => 'inventory'],

            ['key' => 'orders.view', 'name' => 'View Orders', 'module' => 'orders'],
            ['key' => 'orders.update', 'name' => 'Update Orders', 'module' => 'orders'],
            ['key' => 'orders.cancel', 'name' => 'Cancel Orders', 'module' => 'orders'],
            ['key' => 'orders.refund', 'name' => 'Refund Orders', 'module' => 'orders'],
            ['key' => 'orders.change_status', 'name' => 'Change Order Status', 'module' => 'orders'],

            ['key' => 'customers.view', 'name' => 'View Customers', 'module' => 'customers'],
            ['key' => 'customers.create', 'name' => 'Create Customers', 'module' => 'customers'],
            ['key' => 'customers.update', 'name' => 'Update Customers', 'module' => 'customers'],
            ['key' => 'customers.delete', 'name' => 'Delete Customers', 'module' => 'customers'],
            ['key' => 'customers.export', 'name' => 'Export Customers', 'module' => 'customers'],

            ['key' => 'coupons.view', 'name' => 'View Coupons', 'module' => 'coupons'],
            ['key' => 'coupons.create', 'name' => 'Create Coupons', 'module' => 'coupons'],
            ['key' => 'coupons.update', 'name' => 'Update Coupons', 'module' => 'coupons'],
            ['key' => 'coupons.delete', 'name' => 'Delete Coupons', 'module' => 'coupons'],

            ['key' => 'banners.view', 'name' => 'View Promo Banners', 'module' => 'promotions'],
            ['key' => 'banners.create', 'name' => 'Create Promo Banners', 'module' => 'promotions'],
            ['key' => 'banners.update', 'name' => 'Update Promo Banners', 'module' => 'promotions'],
            ['key' => 'banners.delete', 'name' => 'Delete Promo Banners', 'module' => 'promotions'],

            ['key' => 'staff.view', 'name' => 'View Staff', 'module' => 'staff'],
            ['key' => 'staff.invite', 'name' => 'Invite Staff', 'module' => 'staff'],
            ['key' => 'staff.update', 'name' => 'Update Staff', 'module' => 'staff'],
            ['key' => 'staff.remove', 'name' => 'Remove Staff', 'module' => 'staff'],
            ['key' => 'roles.manage', 'name' => 'Manage Roles', 'module' => 'staff'],

            ['key' => 'settings.view', 'name' => 'View Settings', 'module' => 'settings'],
            ['key' => 'settings.update', 'name' => 'Update Settings', 'module' => 'settings'],
            ['key' => 'payments.manage', 'name' => 'Manage Payments', 'module' => 'settings'],
            ['key' => 'shipping.manage', 'name' => 'Manage Shipping', 'module' => 'settings'],

            ['key' => 'activity_logs.view', 'name' => 'View Activity Logs', 'module' => 'system'],
        ];

        foreach ($permissions as $perm) {
            Permission::updateOrCreate(
                ['name' => $perm['key'], 'guard_name' => 'web'],
                [
                    'key' => $perm['key'],
                    'module' => $perm['module'],
                    'description' => $perm['name'],
                ]
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
