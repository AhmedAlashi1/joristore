<?php

namespace App\Modules\Authentication\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Authentication\Actions\RegisterMerchantAction;
use App\Modules\Merchants\Models\Merchant;
use App\Shared\Enums\UserStatus;
use App\Shared\Services\ActivityLogService;
use App\Shared\Services\MerchantContext;
use App\Shared\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct(
        protected RegisterMerchantAction $registerMerchant,
        protected PermissionService $permissionService,
        protected ActivityLogService $activityLog,
    ) {}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'owner_name' => 'required|string|max:255',
            'business_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20|unique:users,phone',
            'password' => 'required|string|min:6|confirmed',
            'country_code' => 'nullable|string|max:5',
            'currency' => 'nullable|string|max:5',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $result = $this->registerMerchant->execute($validator->validated());
        $user = $result['user'];
        MerchantContext::set($result['member']);

        $this->activityLog->log('merchant.registered', 'authentication', 'Merchant account created', Merchant::class, $result['merchant']->id, request: $request);

        MerchantContext::clear();

        return sendResponse([
            'user' => $this->formatUser($user->fresh()),
            'token' => $user->createToken('merchant-dashboard')->plainTextToken,
        ], 'Registration successful');
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return sendError('Invalid credentials', [], 401);
        }

        if ($user->status !== UserStatus::Active) {
            return sendError('Account is not active', [], 403);
        }

        $member = $user->activeMerchantMember();
        if (! $member) {
            return sendError('No active merchant membership', [], 403);
        }

        $user->update(['last_login_at' => now()]);

        return sendResponse([
            'user' => $this->formatUser($user),
            'token' => $user->createToken('merchant-dashboard')->plainTextToken,
        ], 'Login successful');
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return sendResponse([], 'Logout successful');
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
