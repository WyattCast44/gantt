import type { LucideIcon } from 'lucide-react';
import Badge from '@/Components/Badge';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

export interface SectionNavItem<K extends string = string> {
    key: K;
    label: string;
    icon: LucideIcon;
}

interface Props<K extends string> {
    items: SectionNavItem<K>[];
    adminItems?: SectionNavItem<K>[];
    disabledItems?: SectionNavItem<string>[];
    activeKey: K;
    onSelect: (key: K) => void;
    showIcons: boolean;
    isAdmin: boolean;
}

export default function SectionNav<K extends string>({
    items,
    adminItems,
    disabledItems,
    activeKey,
    onSelect,
    showIcons,
    isAdmin,
}: Props<K>) {
    const renderItem = (item: SectionNavItem<K>) => (
        <li key={item.key}>
            <button
                type="button"
                onClick={() => onSelect(item.key)}
                className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    activeKey === item.key
                        ? 'border-l-2 border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/50 dark:text-accent-300'
                        : 'border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200',
                    focusRingNeutral,
                )}
            >
                {showIcons && <item.icon className="h-4 w-4 shrink-0" aria-hidden />}
                {item.label}
            </button>
        </li>
    );

    const hasAdmin = isAdmin && adminItems && adminItems.length > 0;
    const hasDisabled = disabledItems && disabledItems.length > 0;

    return (
        <nav className="w-48 shrink-0">
            <ul className="space-y-0.5">{items.map(renderItem)}</ul>

            {hasAdmin && (
                <>
                    <div className="my-3 border-t border-border/30 dark:border-border-dark/30" />
                    <ul className="space-y-0.5">{adminItems!.map(renderItem)}</ul>
                </>
            )}

            {hasDisabled && (
                <>
                    <div className="my-3 border-t border-border/30 dark:border-border-dark/30" />
                    <ul className="space-y-0.5">
                        {disabledItems!.map((item) => (
                            <li key={item.key}>
                                <span className="flex w-full cursor-not-allowed items-center gap-2.5 px-3 py-2 text-sm text-slate-400 dark:text-neutral-600">
                                    {showIcons && <item.icon className="h-4 w-4 shrink-0" aria-hidden />}
                                    {item.label}
                                    <Badge className="ml-auto text-[10px]">Soon</Badge>
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </nav>
    );
}
