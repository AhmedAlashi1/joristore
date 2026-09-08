<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function profile(Request $request)
    {
        /** @var Admin|null $admin */
        $admin = $request->user();

        if (! $admin) {
            return sendError('Unauthorized', [], 401);
        }

        return sendResponse([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'roles' => $admin->getRoleNames()->values(),
            'permissions' => $admin->getAllPermissions()->pluck('name')->values(),
        ], 'Profile fetched');
    }

    public function updateProfile(Request $request)
    {
        /** @var Admin|null $admin */
        $admin = $request->user();

        if (! $admin) {
            return sendError('Unauthorized', [], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('admins', 'email')->ignore($admin->id)],
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $admin->update($validator->validated());

        return sendResponse([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'roles' => $admin->getRoleNames()->values(),
            'permissions' => $admin->getAllPermissions()->pluck('name')->values(),
        ], 'Profile updated');
    }

    public function updatePassword(Request $request)
    {
        /** @var Admin|null $admin */
        $admin = $request->user();

        if (! $admin) {
            return sendError('Unauthorized', [], 401);
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        if (! Hash::check($request->input('current_password'), $admin->password)) {
            return sendError('Current password is incorrect', [], 422);
        }

        $admin->update([
            'password' => $request->input('new_password'),
        ]);

        return sendResponse([], 'Password updated');
    }

    public function dashboardStats()
    {
        return sendResponse([
            'message' => 'Dashboard ready',
        ], 'Dashboard stats fetched');
    }
}
