<?php

namespace App\Shared\Enums;

enum MerchantStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';
}
