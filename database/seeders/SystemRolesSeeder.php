<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class SystemRolesSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $allPermissions = Permission::where('guard_name', 'web')->pluck('name');

        $roles = [
            'owner' => [
                'name' => 'Owner',
                'description' => 'Store owner with full access',
                'permissions' => [],
            ],
            'manager' => [
                'name' => 'Manager',
                'description' => 'General manager',
                'permissions' => $allPermissions->toArray(),
            ],
            'product_manager' => [
                'name' => 'Product Manager',
                'description' => 'Manages products and catalog',
                'permissions' => Permission::whereIn('module', ['products', 'categories', 'brands', 'inventory', 'promotions', 'dashboard'])->pluck('name')->toArray(),
            ],
            'order_manager' => [
                'name' => 'Order Manager',
                'description' => 'Manages orders and customers',
                'permissions' => Permission::whereIn('module', ['orders', 'customers', 'dashboard'])->pluck('name')->toArray(),
            ],
            'inventory_manager' => [
                'name' => 'Inventory Manager',
                'description' => 'Manages stock and inventory',
                'permissions' => Permission::whereIn('module', ['inventory', 'products', 'dashboard'])->pluck('name')->toArray(),
            ],
            'customer_support' => [
                'name' => 'Customer Support',
                'description' => 'Handles customer inquiries and orders',
                'permissions' => ['dashboard.view', 'orders.view', 'orders.update', 'customers.view', 'customers.update'],
            ],
            'accountant' => [
                'name' => 'Accountant',
                'description' => 'Views reports and orders',
                'permissions' => ['dashboard.view', 'reports.view', 'orders.view', 'customers.view'],
            ],
            'viewer' => [
                'name' => 'Viewer',
                'description' => 'Read-only access',
                'permissions' => Permission::where('key', 'like', '%.view')->pluck('name')->toArray(),
            ],
        ];

        foreach ($roles as $key => $config) {
            $role = Role::updateOrCreate(
                ['name' => $config['name'], 'guard_name' => 'web', 'merchant_id' => null],
                [
                    'key' => $key,
                    'description' => $config['description'],
                    'is_system' => true,
                ]
            );

            if ($key !== 'owner' && ! empty($config['permissions'])) {
                $role->syncPermissions($config['permissions']);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
