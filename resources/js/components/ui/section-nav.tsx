import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { sectionNavLinkClasses } from '@/utils/navLink';
import { Link } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';

export type SectionNavItem<K extends string = string> = {
    key: K;
    label: string;
    href: string;
    icon?: LucideIcon;
};

type SectionNavProps<K extends string> = {
    items: SectionNavItem<K>[];
    activeKey: K;
    className?: string;
};

export default function SectionNav<K extends string>({ items, activeKey, className }: SectionNavProps<K>) {
    return (
        <nav className={cn('flex shrink-0 flex-col gap-0.5 sm:w-44', className)}>
            {items.map((item) => {
                const Icon = item.icon;
                const active = activeKey === item.key;

                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                            'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm',
                            focusRingNeutral,
                            sectionNavLinkClasses(active),
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
                        <span className="truncate">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
