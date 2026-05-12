import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { type PaginationLink } from '@/types';
import { Link } from '@inertiajs/react';

interface PaginationProps {
    links: PaginationLink[];
}

export default function Pagination({ links }: PaginationProps) {
    const { t } = useLocale();

    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {links.map((link, index) => {
                const label = link.label.includes('Previous')
                    ? `&laquo; ${t('Previous')}`
                    : link.label.includes('Next')
                      ? `${t('Next')} &raquo;`
                      : link.label;

                return link.url ? (
                    <Button key={`${link.label}-${index}`} variant={link.active ? 'default' : 'outline'} size="sm" asChild>
                        <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: label }} />
                    </Button>
                ) : (
                    <Button key={`${link.label}-${index}`} variant="outline" size="sm" disabled dangerouslySetInnerHTML={{ __html: label }} />
                );
            })}
        </div>
    );
}
