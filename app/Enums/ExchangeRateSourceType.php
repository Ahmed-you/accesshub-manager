<?php

namespace App\Enums;

enum ExchangeRateSourceType: string
{
    case SubscriptionSale = 'subscription_sale';
    case Payment = 'payment';
    case CapitalBatch = 'capital_batch';
    case ManualReport = 'manual_report';
}
