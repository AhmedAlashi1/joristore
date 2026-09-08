<?php

namespace App\Modules\Staff\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MerchantRoleController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $merchantId = MerchantContext::merchantId();
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Role::query()
            ->with('permissions')
            ->where(function ($q) use ($merchantId) {
                $q->whereNull('merchant_id')->orWhere('merchant_id', $merchantId);
            })
            ->orderByDesc('is_system')
            ->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Role $role) => $this->formatRole($role));

        return sendResponse($paginator, 'Roles fetched');
    }

    public function store(Request $request)
    {
        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'key' => 'required|string|max:100|alpha_dash',
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,key',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        if (Role::where('merchant_id', $merchantId)->where('key', $data['key'])->exists()) {
            return sendError('Role key already exists', [], 422);
        }

        $role = Role::create([
            'name' => $data['name'],
            'key' => $data['key'],
            'description' => $data['description'] ?? null,
            'guard_name' => 'web',
            'merchant_id' => $merchantId,
            'is_system' => false,
        ]);

        if (! empty($data['permissions'])) {
            $permissionIds = Permission::whereIn('key', $data['permissions'])->pluck('id');
            $role->syncPermissions($permissionIds);
        }

        $this->activityLog->log('role.created', 'roles', "Role {$role->name} created", Role::class, $role->id, request: $request);

        return sendResponse($this->formatRole($role->fresh()->load('permissions')), 'Role created');
    }

    public function show(int $id)
    {
        $role = $this->findRole($id);

        if (! $role) {
            return sendError('Role not found', [], 404);
        }

        return sendResponse($this->formatRole($role), 'Role details');
    }

    public function update(Request $request, int $id)
    {
        $role = $this->findRole($id);

        if (! $role) {
            return sendError('Role not found', [], 404);
        }

        if ($role->is_system) {
            return sendError('System roles cannot be modified', [], 422);
        }

        $merchantId = MerchantContext::merchantId();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,key',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $role->update(array_filter([
            'name' => $data['name'] ?? null,
            'description' => $data['description'] ?? null,
        ]));

        if (array_key_exists('permissions', $data)) {
            $permissionIds = Permission::whereIn('key', $data['permissions'] ?? [])->pluck('id');
            $role->syncPermissions($permissionIds);
        }

        $this->activityLog->log('role.updated', 'roles', "Role {$role->name} updated", Role::class, $role->id, request: $request);

        return sendResponse($this->formatRole($role->fresh()->load('permissions')), 'Role updated');
    }

    public function destroy(Request $request, int $id)
    {
        $role = $this->findRole($id);

        if (! $role) {
            return sendError('Role not found', [], 404);
        }

        if ($role->is_system) {
            return sendError('System roles cannot be deleted', [], 422);
        }

        if ($role->members()->exists()) {
            return sendError('Role is assigned to staff members', [], 422);
        }

        $name = $role->name;
        $role->delete();

        $this->activityLog->log('role.deleted', 'roles', "Role {$name} deleted", request: $request);

        return sendResponse([], 'Role deleted');
    }

    public function permissionOptions()
    {
        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('module')
            ->orderBy('key')
            ->get(['id', 'name', 'key', 'module', 'description']);

        return sendResponse($permissions->groupBy('module'), 'Permission options fetched');
    }

    protected function findRole(int $id): ?Role
    {
        $merchantId = MerchantContext::merchantId();

        return Role::query()
            ->with('permissions')
            ->where(function ($q) use ($merchantId) {
                $q->whereNull('merchant_id')->orWhere('merchant_id', $merchantId);
            })
            ->find($id);
    }

    protected function formatRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'key' => $role->key,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'merchant_id' => $role->merchant_id,
            'permissions' => $role->permissions->pluck('key')->filter()->values(),
        ];
    }
}
