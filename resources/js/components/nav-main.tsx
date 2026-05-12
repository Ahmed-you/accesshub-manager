import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLocale } from '@/hooks/use-locale';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { t } = useLocale();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{t('Platform')}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                            <SidebarMenuButton disabled className="opacity-55">
                                {item.icon && <item.icon />}
                                <span>{t(item.title)}</span>
                            </SidebarMenuButton>
                        ) : (
                            <SidebarMenuButton
                                asChild
                                isActive={page.url === item.url || page.url.startsWith(`${item.url}/`) || page.url.startsWith(`${item.url}?`)}
                            >
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{t(item.title)}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
