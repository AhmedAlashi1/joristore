<?php

namespace App\Shared\Services;

use App\Models\User;
use App\Modules\Merchants\Models\MerchantMember;

class PermissionService
{
    public function hasPermission(User $user, string $permission): bool
    {
        $member = MerchantContext::member() ?? $user->activeMerchantMember();

        if (! $member || ! $member->isActive()) {
            return false;
        }

        if ($member->isOwner()) {
            return true;
        }

        $role = $member->role;
        if (! $role) {
            return false;
        }

        return $role->permissions()
            ->where(function ($query) use ($permission) {
                $query->where('key', $permission)
                    ->orWhere('name', $permission);
            })
            ->exists();
    }

    public function permissionsForMember(MerchantMember $member): array
    {
        if ($member->isOwner()) {
            return \App\Models\Permission::query()
                ->where('guard_name', 'web')
                ->pluck('key')
                ->filter()
                ->values()
                ->all();
        }

        return $member->role?->permissions()
            ->pluck('key')
            ->filter()
            ->values()
            ->all() ?? [];
    }
}
