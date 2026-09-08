<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function __construct(protected PermissionService $permissionService) {}

    public function show(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        return sendResponse($this->formatUser($user), 'Profile fetched');
    }

    public function update(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $user->update($validator->validated());

        return sendResponse($this->formatUser($user->fresh()), 'Profile updated');
    }

    public function updatePassword(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        if (! Hash::check($request->input('current_password'), $user->password)) {
            return sendError('Current password is incorrect', [], 422);
        }

        $user->update(['password' => $request->input('new_password')]);

        return sendResponse([], 'Password updated');
    }

    protected function formatUser(User $user): array
    {
        $member = $user->activeMerchantMember();
        $merchant = $member?->merchant;
        $store = $merchant?->store;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role' => $member?->role?->key,
            'role_name' => $member?->role?->name,
            'is_owner' => $member?->isOwner() ?? false,
            'merchant' => $merchant ? [
                'id' => $merchant->id,
                'business_name' => $merchant->business_name,
                'slug' => $merchant->slug,
                'logo' => $merchant->logo,
                'currency' => $merchant->currency,
            ] : null,
            'store' => $store ? [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
            ] : null,
            'permissions' => $member
                ? $this->permissionService->permissionsForMember($member)
                : [],
        ];
    }
}
