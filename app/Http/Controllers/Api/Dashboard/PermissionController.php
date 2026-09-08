<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Permission::query()->where('guard_name', 'web')->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Permission $permission) => $this->formatPermission($permission));

        return sendResponse($paginator, 'Permissions fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name,NULL,id,guard_name,web',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $permission = Permission::create([
            'name' => $validator->validated()['name'],
            'guard_name' => 'web',
        ]);

        return sendResponse($this->formatPermission($permission), 'Permission created');
    }

    public function show(int $id)
    {
        $permission = Permission::find($id);

        if (! $permission || $permission->guard_name !== 'web') {
            return sendError('Permission not found', [], 404);
        }

        return sendResponse($this->formatPermission($permission), 'Permission details');
    }

    public function update(Request $request, int $id)
    {
        $permission = Permission::find($id);

        if (! $permission || $permission->guard_name !== 'web') {
            return sendError('Permission not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255', Rule::unique('permissions', 'name')->ignore($permission->id)->where('guard_name', 'web')],
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $permission->update($validator->validated());

        return sendResponse($this->formatPermission($permission->fresh()), 'Permission updated');
    }

    public function destroy(int $id)
    {
        $permission = Permission::find($id);

        if (! $permission || $permission->guard_name !== 'web') {
            return sendError('Permission not found', [], 404);
        }

        $permission->delete();

        return sendResponse([], 'Permission deleted');
    }

    public function options()
    {
        $items = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        return sendResponse($items, 'Permission options');
    }

    private function formatPermission(Permission $permission): array
    {
        return [
            'id' => $permission->id,
            'name' => $permission->name,
            'guard_name' => $permission->guard_name,
            'created_at' => $permission->created_at,
        ];
    }
}
