<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Role::query()->where('guard_name', 'web')->with('permissions')->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Role $role) => $this->formatRole($role));

        return sendResponse($paginator, 'Roles fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name,NULL,id,guard_name,web',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        $role = Role::create([
            'name' => $data['name'],
            'guard_name' => 'web',
        ]);

        if (! empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        return sendResponse($this->formatRole($role->fresh()->load('permissions')), 'Role created');
    }

    public function show(int $id)
    {
        $role = Role::with('permissions')->find($id);

        if (! $role || $role->guard_name !== 'web') {
            return sendError('Role not found', [], 404);
        }

        return sendResponse($this->formatRole($role), 'Role details');
    }

    public function update(Request $request, int $id)
    {
        $role = Role::find($id);

        if (! $role || $role->guard_name !== 'web') {
            return sendError('Role not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)->where('guard_name', 'web')],
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        if (array_key_exists('name', $data)) {
            $role->name = $data['name'];
            $role->save();
        }

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($data['permissions'] ?? []);
        }

        return sendResponse($this->formatRole($role->fresh()->load('permissions')), 'Role updated');
    }

    public function destroy(int $id)
    {
        $role = Role::find($id);

        if (! $role || $role->guard_name !== 'web') {
            return sendError('Role not found', [], 404);
        }

        if ($role->name === 'super-admin') {
            return sendError('The super-admin role cannot be deleted', [], 422);
        }

        $role->delete();

        return sendResponse([], 'Role deleted');
    }

    public function options()
    {
        $items = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        return sendResponse($items, 'Role options');
    }

    public function permissionOptions()
    {
        $items = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        return sendResponse($items, 'Permission options');
    }

    private function formatRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'guard_name' => $role->guard_name,
            'permissions' => $role->permissions->pluck('name')->values(),
            'permissions_count' => $role->permissions->count(),
            'created_at' => $role->created_at,
        ];
    }
}
