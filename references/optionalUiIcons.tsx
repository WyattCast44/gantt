import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowLeftRight,
    CalendarDays,
    Car,
    CreditCard,
    FileText,
    FolderOpen,
    HomeIcon,
    HouseIcon,
    Inbox,
    KeyRound,
    Landmark,
    LayoutDashboard,
    LogOut,
    PieChart,
    PiggyBank,
    Receipt,
    Settings,
    SlidersHorizontal,
    User,
    Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Leading icon for sidebar nav rows when optional UI icons are enabled.
 */
export function OptionalSidebarIcon({
    show,
    Icon,
    className,
    compact = false,
}: {
    show: boolean;
    Icon: LucideIcon;
    className?: string;
    /** Icon only (e.g. collapsed sidebar rail) — no trailing margin. */
    compact?: boolean;
}): ReactNode {
    if (!show) {
        return null;
    }

    return (
        <Icon
            className={cn(compact ? 'h-4 w-4 shrink-0' : 'mr-2 h-4 w-4 shrink-0', className)}
            aria-hidden
        />
    );
}

export const appPrimaryNavIcons: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    Calendar: CalendarDays,
    Inbox: Inbox,
    Credentials: KeyRound,
    Documents: FolderOpen,
};

export const appSecondaryNavIcons: Record<string, LucideIcon> = {
    Accounts: Landmark,
    Incomes: PiggyBank,
    Bills: Receipt,
    Buckets: PieChart,
    'Credit Reports': CreditCard,
    Vehicles: Car,
};

export const appUserMenuIcons = {
    profile: User,
    settings: Settings,
    signOut: LogOut,
} as const;

/** Settings sidebar: item label → icon (Dashboard back link uses `dashboard`). Accounts/Bills/Incomes reuse app secondary nav icons. */
export const settingsNavIcons: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    Household: HouseIcon,
    Members: Users,
    Profile: User,
    Accounts: appSecondaryNavIcons.Accounts,
    Bills: appSecondaryNavIcons.Bills,
    Incomes: appSecondaryNavIcons.Incomes,
    Documents: FileText,
};

export const settingsUserMenuIcons = {
    signOut: LogOut,
} as const;
