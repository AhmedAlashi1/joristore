<?php

namespace App\Shared\Enums;

enum MerchantMemberStatus: string
{
    case Invited = 'invited';
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';
}
