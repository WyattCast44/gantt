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
import {
    OptionalSidebarIcon,
    appPrimaryNavIcons,
    appSecondaryNavIcons,
    appUserMenuIcons,
} from '@/Layouts/optionalUiIcons';

interface AppLayoutProps {
    title: string;
}

const primaryNav = [
    { name: 'Dashboard', href: '/dashboard', match: '/dashboard' },
    { name: 'Calendar', href: '/calendar', match: '/calendar' },
    { name: 'Inbox', href: '/inbox', match: '/inbox' },
    { name: 'Documents', href: '/documents', match: '/documents' },
    { name: 'Credentials', href: '/credentials', match: '/credentials' },
];

const secondaryNav: {
    name: string;
    href: string;
    match: string;
    disabled?: boolean;
}[] = [
    { name: 'Accounts', href: '/accounts', match: '/accounts' },
    { name: 'Incomes', href: '/incomes', match: '/incomes' },
    { name: 'Bills', href: '/bills', match: '/bills' },
    { name: 'Buckets', href: '/buckets', match: '/buckets' },
    { name: 'Credit Reports', href: '/credit-reports', match: '/credit-reports' },
    { name: 'Vehicles', href: '/vehicles', match: '/vehicles' },
];

export default function AppLayout({ title, children }: PropsWithChildren<AppLayoutProps>) {
    return (
        <SidePanelProvider>
            <Head title={title} />
            <AppShell title={title}>{children}</AppShell>
        </SidePanelProvider>
    );
}

function AppShell({ children }: PropsWithChildren<{ title: string }>) {
    const page = usePage<{ props: SharedProps }>();
    const { auth, sidebarCollapsed } = page.props as unknown as SharedProps;
    const isCollapsed = sidebarCollapsed;
    const showOptionalIcons = Boolean(auth.user?.show_optional_ui_icons);
    const showIcons = showOptionalIcons || isCollapsed;
    const currentUrl = page.url;
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

    function navLinkClasses(isActive: boolean, disabled?: boolean): string {
        if (isCollapsed) {
            if (isActive) {
                return 'bg-accent-50 font-semibold text-accent-600 dark:bg-accent-500/10 dark:text-accent-400';
            }
            if (disabled) {
                return 'cursor-not-allowed text-slate-400 dark:text-neutral-600';
            }
            return 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';
        }
        if (isActive) {
            return 'border-l-2 border-accent-500 bg-accent-50 pl-2 font-semibold text-accent-600 dark:border-accent-400 dark:bg-accent-500/10 dark:text-accent-400';
        }
        if (disabled) {
            return 'cursor-not-allowed text-slate-400 dark:text-neutral-600';
        }
        return 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white';
    }

    const navLinkRowClass = isCollapsed ? 'justify-center px-1.5' : 'px-2.5';

    const userMenuPanelClass = cn(
        'z-[100] rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-800',
    );

    const userMenuContent = auth.user ? (
        <>
            {auth.user.role === 'admin' && (
                <Link
                    href="/settings/profile"
                    className={cn(
                        'flex items-center rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
                        focusRingNeutral,
                    )}
                >
                    <OptionalSidebarIcon show={showIcons} compact={false} Icon={appUserMenuIcons.settings} />
                    <span>Settings</span>
                </Link>
            )}
            {auth.user.role === 'admin' && (
                <div className="my-1 border-t border-border dark:border-border-dark" />
            )}
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
                <OptionalSidebarIcon show={showIcons} compact={false} Icon={appUserMenuIcons.signOut} />
                <span>Sign out</span>
            </button>
        </>
    ) : null;

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950">
            <ThemeSync />
            <ResizableSidebar>
                <div className="flex min-h-0 flex-1 flex-col">
                    {/* User section — outside scroll so flyouts are not clipped */}
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
                        {/* Primary nav */}
                        <nav className="space-y-0.5 px-2 py-3">
                            {primaryNav.map((item) => {
                                const isActive = item.match ? currentUrl.startsWith(item.match) : false;
                                const NavIcon = appPrimaryNavIcons[item.name];
                                const link = (
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
                                );
                                return (
                                    <SidebarTooltip key={item.name} enabled={isCollapsed} label={item.name} className="w-full">
                                        {link}
                                    </SidebarTooltip>
                                );
                            })}
                        </nav>

                        {/* Divider + secondary nav */}
                        <div className="border-t border-border dark:border-border-dark" />
                        <nav className="flex-1 space-y-0.5 px-2 py-3">
                            {secondaryNav.map((item) => {
                                const isActive = item.match ? currentUrl.startsWith(item.match) : false;
                                const NavIcon = appSecondaryNavIcons[item.name];
                                const link = (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'flex items-center rounded-md py-1.5 text-sm',
                                            'w-full',
                                            navLinkRowClass,
                                            navLinkClasses(isActive, item.disabled),
                                            focusRingNeutral,
                                        )}
                                    >
                                        {NavIcon && (
                                            <OptionalSidebarIcon show={showIcons} compact={isCollapsed} Icon={NavIcon} />
                                        )}
                                        <span className={isCollapsed ? 'sr-only' : undefined}>{item.name}</span>
                                    </Link>
                                );
                                return (
                                    <SidebarTooltip key={item.name} enabled={isCollapsed} label={item.name} className="w-full">
                                        {link}
                                    </SidebarTooltip>
                                );
                            })}
                        </nav>
                    </div>
                </div>

            </ResizableSidebar>

            {/* Main content */}
            <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white dark:bg-neutral-950">
                <div className="flex min-h-0 w-full flex-1 flex-col p-6">
                    {children}
                </div>
            </main>

            <SidePanel />
            <FlashMessages />
        </div>
    );
}
