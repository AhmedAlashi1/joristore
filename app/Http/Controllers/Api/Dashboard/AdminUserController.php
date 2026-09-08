<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Admin::query()->with('roles')->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Admin $admin) => $this->formatAdmin($admin));

        return sendResponse($paginator, 'Admins fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:admins,email',
            'password' => 'required|string|min:6',
            'roles' => 'nullable|array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $roles = $data['roles'] ?? ['super-admin'];

        $admin = Admin::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'roles_name' => json_encode($roles),
        ]);

        $admin->syncRoles($roles);

        return sendResponse($this->formatAdmin($admin->fresh()->load('roles')), 'Admin created');
    }

    public function show(int $id)
    {
        $admin = Admin::with('roles')->find($id);

        if (! $admin) {
            return sendError('Admin not found', [], 404);
        }

        return sendResponse($this->formatAdmin($admin), 'Admin details');
    }

    public function update(Request $request, int $id)
    {
        $admin = Admin::find($id);

        if (! $admin) {
            return sendError('Admin not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('admins', 'email')->ignore($admin->id)],
            'password' => 'nullable|string|min:6',
            'roles' => 'nullable|array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();

        if (array_key_exists('name', $data)) {
            $admin->name = $data['name'];
        }

        if (array_key_exists('email', $data)) {
            $admin->email = $data['email'];
        }

        if (! empty($data['password'])) {
            $admin->password = $data['password'];
        }

        if (array_key_exists('roles', $data)) {
            $roles = $data['roles'] ?? [];
            $admin->roles_name = json_encode($roles);
            $admin->syncRoles($roles);
        }

        $admin->save();

        return sendResponse($this->formatAdmin($admin->fresh()->load('roles')), 'Admin updated');
    }

    public function destroy(Request $request, int $id)
    {
        $admin = Admin::find($id);

        if (! $admin) {
            return sendError('Admin not found', [], 404);
        }

        if ((int) $request->user()?->id === (int) $admin->id) {
            return sendError('You cannot delete your own account', [], 422);
        }

        $admin->delete();

        return sendResponse([], 'Admin deleted');
    }

    public function roleOptions()
    {
        $items = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        return sendResponse($items, 'Role options');
    }

    private function formatAdmin(Admin $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'roles' => $admin->getRoleNames()->values(),
            'permissions' => $admin->getAllPermissions()->pluck('name')->values(),
            'created_at' => $admin->created_at,
        ];
    }
}
