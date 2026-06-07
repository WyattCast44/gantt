import { Head, Link, usePage, router } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import {
    PropsWithChildren,
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    useCallback,
} from 'react';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import type { SharedProps } from '@/types';
import { SidePanelProvider } from '@/Contexts/SidePanelContext';
import SidePanel from '@/Components/SidePanel';
import FlashMessages from '@/Components/FlashMessages';
import ThemeSync from '@/Components/ThemeSync';
import ResizableSidebar from '@/Components/ResizableSidebar';
import { SidebarTooltip } from '@/Components/SidebarTooltip';
import Avatar from '@/Components/Avatar';
import { OptionalSidebarIcon, settingsNavIcons, settingsUserMenuIcons } from '@/Layouts/optionalUiIcons';

interface SettingsLayoutProps {
    title: string;
}

interface NavItem {
    name: string;
    href: string;
    /** Single prefix or list of URL prefixes (active when `currentUrl` starts with any). */
    match: string | string[];
}

interface NavSection {
    label?: string;
    items: NavItem[];
}

const settingsNavAll: NavSection[] = [
    {
        items: [
            { name: 'Profile', href: '/settings/profile', match: '/settings/profile' },
            { name: 'Household', href: '/settings/general', match: '/settings/general' },
            { name: 'Members', href: '/settings/members', match: '/settings/members' },
        ],
    },
    {
        label: 'Manage',
        items: [
            { name: 'Accounts', href: '/settings/deleted-accounts', match: '/settings/deleted-accounts' },
            { name: 'Incomes', href: '/settings/income-categories', match: ['/settings/income-categories', '/settings/deleted-incomes'] },
            { name: 'Bills', href: '/settings/bill-categories', match: ['/settings/bill-categories', '/settings/deleted-bills'] },
            { name: 'Documents', href: '/settings/document-folders', match: '/settings/document-folders' },
        ],
    },
];

const settingsNavProfileOnly: NavSection[] = [
    {
        items: [
            { name: 'Profile', href: '/settings/profile', match: '/settings/profile' },
        ],
    },
];

export default function SettingsLayout({ title, children }: PropsWithChildren<SettingsLayoutProps>) {
    return (
        <SidePanelProvider>
            <Head title={title} />
            <SettingsShell>{children}</SettingsShell>
        </SidePanelProvider>
    );
}

function SettingsShell({ children }: PropsWithChildren) {
    const page = usePage<{ props: SharedProps }>();
    const { auth, sidebarCollapsed } = page.props as unknown as SharedProps;
    const isCollapsed = sidebarCollapsed;
    const showOptionalIcons = Boolean(auth.user?.show_optional_ui_icons);
    const showIcons = showOptionalIcons || isCollapsed;
    const currentUrl = page.url;
    const settingsNav = auth.user?.role === 'admin' ? settingsNavAll : settingsNavProfileOnly;

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const menuPanelRef = useRef<HTMLDivElement>(null);
    const userMenuButtonRef = useRef<HTMLButtonElement>(null);
    const [collapsedMenuPos, setCollapsedMenuPos] = useState<{ top: number; left: number } | null>(
        null,
    );

    const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

    useLayoutEffect(() => {
        if (!userMenuOpen || !isCollapsed || !userMenuButtonRef.current) {
            setCollapsedMenuPos(null);
            return;
        }
        const place = (): void => {
            const btn = userMenuButtonRef.current;
            if (!btn) {
                return;
            }
            const r = btn.getBoundingClientRect();
            setCollapsedMenuPos({ top: r.top, left: r.right + 8 });
        };
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [userMenuOpen, isCollapsed]);

    useEffect(() => {
        if (!userMenuOpen) return;
        function handleClick(e: MouseEvent) {
            const t = e.target as Node;
            if (userMenuRef.current?.contains(t)) return;
            if (menuPanelRef.current?.contains(t)) return;
            closeUserMenu();
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') closeUserMenu();
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [userMenuOpen, closeUserMenu]);

    function navLinkClasses(isActive: boolean): string {
        if (isCollapsed) {
            if (isActive) {
                return 'bg-accent-50 font-semibold text-accent-600 dark:bg-accent-500/10 dark:text-accent-400';
            }
            return 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';
        }
        if (isActive) {
            return 'border-l-2 border-accent-500 bg-accent-50 pl-2 font-semibold text-accent-600 dark:border-accent-400 dark:bg-accent-500/10 dark:text-accent-400';
        }
        return 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';
    }

    const navLinkRowClass = isCollapsed ? 'justify-center px-1.5' : 'px-2.5';

    const userMenuPanelClass = cn(
        'z-[100] rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-800',
    );

    const userMenuContent = auth.user ? (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                router.post('/logout');
            }}
            className={cn(
                'flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
                focusRingNeutral,
            )}
        >
            <OptionalSidebarIcon show={showIcons} compact={false} Icon={settingsUserMenuIcons.signOut} />
            <span>Sign out</span>
        </button>
    ) : null;

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950">
            <ThemeSync />
            <ResizableSidebar>
                <div className="flex min-h-0 flex-1 flex-col">
                    {/* User section */}
                    {auth.user && (
                        <div
                            className={cn(
                                'relative shrink-0 border-b border-border dark:border-border-dark',
                                isCollapsed ? 'px-2 py-2' : 'px-3 py-3',
                            )}
                            ref={userMenuRef}
                        >
                            <SidebarTooltip
                                enabled={isCollapsed}
                                label={`${auth.user.name} — account menu`}
                                className="w-full"
                            >
                                <button
                                    ref={userMenuButtonRef}
                                    type="button"
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className={cn(
                                        isCollapsed
                                            ? 'flex w-full items-center justify-center rounded-md py-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800'
                                            : 'flex w-full items-center justify-between rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-neutral-800',
                                        focusRingNeutral,
                                    )}
                                >
                                    {isCollapsed ? (
                                        <Avatar size="sm" name={auth.user.name} src={auth.user.avatar_url} />
                                    ) : (
                                        <>
                                            <div className="flex min-w-0 items-center gap-2 text-left">
                                                <Avatar size="sm" name={auth.user.name} src={auth.user.avatar_url} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                        {auth.user.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500 dark:text-neutral-400">
                                                        {auth.household?.name ?? (auth.user.role === 'admin' ? 'Admin' : 'Member')}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-neutral-500 ${userMenuOpen ? 'rotate-180' : ''}`}
                                            >
                                                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </SidebarTooltip>

                            {userMenuOpen &&
                                (isCollapsed && collapsedMenuPos !== null
                                    ? createPortal(
                                          <div
                                              ref={menuPanelRef}
                                              className={cn(userMenuPanelClass, 'fixed min-w-[10rem]')}
                                              style={{
                                                  top: collapsedMenuPos.top,
                                                  left: collapsedMenuPos.left,
                                              }}
                                          >
                                              {userMenuContent}
                                          </div>,
                                          document.body,
                                      )
                                    : !isCollapsed ? (
                                          <div
                                              ref={menuPanelRef}
                                              className={cn(userMenuPanelClass, 'absolute left-2 right-2 top-full mt-1')}
                                          >
                                              {userMenuContent}
                                          </div>
                                      ) : null)}
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {/* Primary nav — back to app */}
                        <nav className="space-y-0.5 px-2 py-3">
                            <SidebarTooltip enabled={isCollapsed} label="Dashboard" className="w-full">
                                <Link
                                    href="/dashboard"
                                    className={cn(
                                        'flex items-center rounded-md py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                                        'w-full',
                                        navLinkRowClass,
                                        focusRingNeutral,
                                    )}
                                >
                                    <OptionalSidebarIcon
                                        show={showIcons}
                                        compact={isCollapsed}
                                        Icon={settingsNavIcons.dashboard}
                                    />
                                    <span className={isCollapsed ? 'sr-only' : undefined}>Dashboard</span>
                                </Link>
                            </SidebarTooltip>
                        </nav>

                        {/* Divider + settings nav */}
                        <div className="border-t border-border dark:border-border-dark" />
                        <nav className="flex-1 px-2 py-3">
                            {settingsNav.map((section, si) => (
                                <div key={si}>
                                    {si > 0 && (
                                        <div className="-mx-2 my-3 border-t border-border dark:border-border-dark" />
                                    )}
                                    {section.label && !isCollapsed && (
                                        <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                                            {section.label}
                                        </p>
                                    )}
                                    <div className="space-y-0.5">
                                        {section.items.map((item) => {
                                            const prefixes = Array.isArray(item.match) ? item.match : [item.match];
                                            const isActive = prefixes.some((prefix) => currentUrl.startsWith(prefix));
                                            const NavIcon = settingsNavIcons[item.name];
                                            return (
                                                <SidebarTooltip
                                                    key={item.name}
                                                    enabled={isCollapsed}
                                                    label={item.name}
                                                    className="w-full"
                                                >
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            'flex items-center rounded-md py-1.5 text-sm',
                                                            'w-full',
                                                            navLinkRowClass,
                                                            navLinkClasses(isActive),
                                                            focusRingNeutral,
                                                        )}
                                                    >
                                                        {NavIcon && (
                                                            <OptionalSidebarIcon show={showIcons} compact={isCollapsed} Icon={NavIcon} />
                                                        )}
                                                        <span className={isCollapsed ? 'sr-only' : undefined}>{item.name}</span>
                                                    </Link>
                                                </SidebarTooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            </ResizableSidebar>

            {/* Main content */}
            <main className="relative z-0 min-w-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-950">
                <div className="p-6">
                    {children}
                </div>
            </main>

            <SidePanel />
            <FlashMessages />
        </div>
    );
}
