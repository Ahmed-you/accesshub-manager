import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface FlashMessages {
    success?: string | null;
    error?: string | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    disabled?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash: FlashMessages;
    [key: string]: unknown;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
    last_page: number;
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface ServiceOption extends SelectOption {
    default_duration_value?: number | null;
    default_duration_unit?: string | null;
    image_url?: string | null;
}

export interface SubscriptionOption extends SelectOption {
    customer_id: string;
}

export interface PaymentSubscriptionOption extends SelectOption {
    customer_id: string;
    sale_amount_usd: string;
    paid_total_usd: string;
}

export interface ResourceFilters {
    search: string;
}

export interface Customer {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    preferred_currency: string;
    telegram_username?: string | null;
    telegram_chat_id?: string | null;
    telegram_notifications_enabled?: boolean;
    telegram_opted_in_at?: string | null;
    notes: string | null;
    subscriptions_count?: number;
    payments_count?: number;
    created_at: string;
    updated_at: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    active: boolean;
    subscriptions_count?: number;
    created_at: string;
    updated_at: string;
}

export interface Service {
    id: number;
    name: string;
    category: string | null;
    description: string | null;
    default_duration_value?: number | null;
    default_duration_unit?: string | null;
    default_duration_days: number | null;
    active: boolean;
    image_url?: string | null;
    subscriptions_count?: number;
    created_at: string;
    updated_at: string;
}

export interface Subscription {
    id: number;
    internal_order_number: string;
    customer_id: number;
    customer_name: string | null;
    service_id: number;
    service_name: string | null;
    service_image_url?: string | null;
    supplier_id: number;
    supplier_name: string | null;
    plan_name: string;
    account_identifier: string;
    duration_value: number;
    duration_unit: string;
    duration_label: string;
    sale_recorded_at: string | null;
    start_date: string;
    end_date: string;
    delivered_at: string | null;
    sale_amount_original: string;
    sale_currency: string;
    sale_exchange_rate_to_usd: string;
    sale_amount_usd: string;
    cost_usd: string;
    profit_usd: string;
    status: string;
    payment_status: string;
    payment_status_label: string;
    paid_total_usd: string;
    countdown_status: string;
    countdown_label: string;
    days_remaining: number;
    renewed_from_subscription_id?: number | null;
    renewed_from_label?: string | null;
    cancel_reason?: string | null;
    refund_reason?: string | null;
    notes?: string | null;
}

export interface Payment {
    id: number;
    subscription_id: number;
    subscription_label: string | null;
    customer_id: number;
    customer_name: string | null;
    service_name: string | null;
    amount_original: string;
    currency: string;
    exchange_rate_to_usd: string;
    amount_usd: string;
    paid_at: string | null;
    method: string;
    method_label?: string | null;
    reference?: string | null;
    notes?: string | null;
}

export interface ExpiryReminder {
    id: number;
    subscription_id: number;
    customer_id: number;
    internal_order_number: string;
    customer_name: string | null;
    service_name: string | null;
    account_identifier: string | null;
    end_date: string | null;
    reminder_date: string | null;
    days_before_expiry: number;
    status: string;
    status_label: string;
    sent_at: string | null;
    timing_status: string;
    timing_label: string;
    timing_replacements?: Record<string, string | number>;
    countdown_status: string;
    countdown_label: string;
}

export interface AuditLog {
    id: number;
    event: string;
    event_label: string;
    user_name: string | null;
    user_username: string | null;
    auditable_type: string | null;
    auditable_label: string;
    auditable_id: number | null;
    changed_fields: string[];
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
    ip_address: string | null;
    created_at: string | null;
}

export interface ExchangeRateSnapshot {
    id: number;
    source_type: string | null;
    source_id: number | null;
    source_label: string;
    source_url: string | null;
    from_currency: string;
    to_currency: string;
    rate: string;
    captured_at: string | null;
    provider: string | null;
    notes: string | null;
    created_at: string | null;
}

export interface CapitalBatch {
    id: number;
    usd_amount: string;
    funding_date: string;
    reference_currency: string;
    reference_exchange_rate_to_usd: string | null;
    reference_original_amount: string | null;
    remaining_usd: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    name: string;
    username: string;
    email: string | null;
    role: string;
    avatar?: string;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
