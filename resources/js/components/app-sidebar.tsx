import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLocale } from '@/hooks/use-locale';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    Bell,
    ChartColumn,
    CircleDollarSign,
    ClipboardList,
    CreditCard,
    History,
    LayoutGrid,
    Package,
    Send,
    Truck,
    Users,
    WalletCards,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Customers',
        url: '/customers',
        icon: Users,
    },
    {
        title: 'Suppliers',
        url: '/suppliers',
        icon: Truck,
    },
    {
        title: 'Services',
        url: '/services',
        icon: Package,
    },
    {
        title: 'Subscriptions',
        url: '/subscriptions',
        icon: ClipboardList,
    },
    {
        title: 'Payments',
        url: '/payments',
        icon: CreditCard,
    },
    {
        title: 'Rates',
        url: '/exchange-rate-snapshots',
        icon: CircleDollarSign,
    },
    {
        title: 'Capital',
        url: '/capital-batches',
        icon: WalletCards,
    },
    {
        title: 'Reports',
        url: '/reports',
        icon: ChartColumn,
    },
    {
        title: 'Reminders',
        url: '/reminders',
        icon: Bell,
    },
    {
        title: 'Telegram automation',
        url: '/automation/telegram',
        icon: Send,
    },
    {
        title: 'Audit log',
        url: '/audit-logs',
        icon: History,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { isArabic } = useLocale();

    return (
        <Sidebar collapsible="icon" variant="inset" side={isArabic ? 'right' : 'left'}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
