<?php

namespace App\Modules\Partners\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Partners\Models\PartnerAccount;
use App\Shared\Services\MerchantContext;
use App\Shared\Support\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class PartnerAuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login_phone' => 'required|string|max:20',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $phone = PhoneNormalizer::normalize($validator->validated()['login_phone']);
        $password = $validator->validated()['password'];
        $merchantId = MerchantContext::merchantId();

        $account = PartnerAccount::query()
            ->with('partner')
            ->where('login_phone', $phone)
            ->first();

        if (! $account || ! Hash::check($password, $account->password)) {
            return sendError('Invalid phone or password', [], 401);
        }

        if ($merchantId && (int) $account->partner->merchant_id !== (int) $merchantId) {
            return sendError('Partner not registered for this store', [], 404);
        }

        if ($account->partner->status !== 'active') {
            return sendError('Partner account is inactive', [], 403);
        }

        $account->update(['last_login_at' => now()]);
        $token = $account->createToken('partner-portal')->plainTextToken;

        return sendResponse([
            'token' => $token,
            'partner' => [
                'id' => $account->partner->id,
                'name' => $account->partner->name,
                'name_en' => $account->partner->name_en,
                'login_phone' => $account->login_phone,
            ],
        ], 'Login successful');
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return sendResponse([], 'Logged out');
    }

    public function me(Request $request)
    {
        /** @var PartnerAccount $account */
        $account = $request->user();
        $account->load('partner');

        return sendResponse([
            'partner' => [
                'id' => $account->partner->id,
                'name' => $account->partner->name,
                'name_en' => $account->partner->name_en,
                'login_phone' => $account->login_phone,
                'status' => $account->partner->status,
            ],
        ], 'Partner profile');
    }
}
