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

        $allNames = Permission::query()->where('guard_name', 'web')->pluck('name')->all();
        if ($allNames === []) {
            return;
        }

        Role::query()
            ->where('guard_name', 'web')
            ->where('key', 'manager')
            ->each(function (Role $role) use ($allNames) {
                $role->syncPermissions($allNames);
            });

        $promoNames = Permission::query()
            ->where('guard_name', 'web')
            ->where(function ($q) {
                $q->where('module', 'promotions')
                    ->orWhere('key', 'like', 'banners.%');
            })
            ->pluck('name')
            ->all();

        if ($promoNames !== []) {
            Role::query()
                ->where('guard_name', 'web')
                ->where(function ($q) {
                    $q->where('key', 'super-admin')
                        ->orWhere('name', 'like', '%Admin%');
                })
                ->each(function (Role $role) use ($promoNames) {
                    $role->givePermissionTo(
                        Permission::query()->where('guard_name', 'web')->whereIn('name', $promoNames)->get()
                    );
                });
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Permissions remain; no rollback.
    }
};
