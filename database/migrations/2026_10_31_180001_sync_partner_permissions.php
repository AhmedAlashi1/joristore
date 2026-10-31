<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $keys = ['partners.view', 'partners.manage', 'partner_payouts.manage'];
        foreach ([
            ['key' => 'partners.view', 'name' => 'View Partners', 'module' => 'partners'],
            ['key' => 'partners.manage', 'name' => 'Manage Partners', 'module' => 'partners'],
            ['key' => 'partner_payouts.manage', 'name' => 'Partner Payouts', 'module' => 'partners'],
        ] as $perm) {
            Permission::updateOrCreate(
                ['name' => $perm['key'], 'guard_name' => 'web'],
                ['key' => $perm['key'], 'module' => $perm['module'], 'description' => $perm['name']]
            );
        }

        $names = Permission::whereIn('key', $keys)->pluck('name')->toArray();
        foreach (Role::whereIn('key', ['owner', 'manager', 'super-admin'])->get() as $role) {
            $role->givePermissionTo($names);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::whereIn('key', ['partners.view', 'partners.manage', 'partner_payouts.manage'])->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
