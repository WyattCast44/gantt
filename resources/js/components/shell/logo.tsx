import { cn } from '@/utils/cn';
import { useCallback, useState, type MouseEvent, type TransitionEvent } from 'react';

type LogoSize = 'default' | 'lg';

const logoSizes: Record<LogoSize, { icon: string; text: string }> = {
    default: { icon: 'h-6 w-7', text: 'text-base font-semibold' },
    lg: { icon: 'h-9 w-10', text: 'text-2xl font-semibold' },
};

const returnDelays = ['0s', '0.04s', '0.08s', '0.05s'];

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function logoBars(root: HTMLElement): SVGRectElement[] {
    return [...root.querySelectorAll<SVGRectElement>('.logo-bar')];
}

function clearBarStyles(bar: SVGRectElement): void {
    bar.style.animation = '';
    bar.style.transition = '';
    bar.style.transitionDelay = '';
    bar.style.transform = '';
}

type LogoProps = {
    collapsed?: boolean;
    size?: LogoSize;
    className?: string;
};

export function LogoIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 28 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('logo-icon shrink-0', className)}
            aria-hidden
        >
            <line x1="3" y1="2" x2="3" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            {[8, 12, 16, 20, 24].map((x) => (
                <line
                    key={x}
                    x1={x}
                    y1="2"
                    x2={x}
                    y2="22"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    strokeDasharray="1.5 2"
                    className="text-slate-500 dark:text-neutral-400"
                />
            ))}
            <rect x="5" y="3" width="18" height="3.5" rx="1" className="logo-bar logo-bar-1 fill-blue-500" />
            <rect x="5" y="8.5" width="13" height="3.5" rx="1" className="logo-bar logo-bar-2 fill-teal-500" />
            <rect x="5" y="14" width="9" height="3.5" rx="1" className="logo-bar logo-bar-3 fill-violet-500" />
            <rect x="5" y="19.5" width="5" height="3.5" rx="1" className="logo-bar logo-bar-4 fill-rose-400" />
        </svg>
    );
}

export default function Logo({ collapsed = false, size = 'default', className }: LogoProps) {
    const styles = logoSizes[size];
    const [hovered, setHovered] = useState(false);

    const handleMouseEnter = useCallback((event: MouseEvent<HTMLSpanElement>) => {
        if (prefersReducedMotion()) {
            return;
        }

        logoBars(event.currentTarget).forEach(clearBarStyles);
        setHovered(true);
    }, []);

    const handleMouseLeave = useCallback((event: MouseEvent<HTMLSpanElement>) => {
        if (prefersReducedMotion()) {
            setHovered(false);

            return;
        }

        const bars = logoBars(event.currentTarget);

        bars.forEach((bar) => {
            const transform = getComputedStyle(bar).transform;

            bar.style.animation = 'none';
            bar.style.transform = transform === 'none' ? 'scaleX(1)' : transform;
        });

        requestAnimationFrame(() => {
            bars.forEach((bar, index) => {
                bar.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.transitionDelay = returnDelays[index] ?? '0s';
                bar.style.transform = 'scaleX(1)';
            });
        });

        setHovered(false);
    }, []);

    const handleTransitionEnd = useCallback((event: TransitionEvent<HTMLSpanElement>) => {
        if (event.propertyName !== 'transform') {
            return;
        }

        const bar = event.target;

        if (!(bar instanceof SVGRectElement) || !bar.classList.contains('logo-bar')) {
            return;
        }

        clearBarStyles(bar);
    }, []);

    return (
        <span
            className={cn(
                'flex items-center gap-2.5 text-slate-900 dark:text-white',
                hovered && 'logo-hovered',
                className,
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTransitionEnd={handleTransitionEnd}
        >
            <LogoIcon className={styles.icon} />
            {!collapsed && <span className={cn(styles.text, 'tracking-tight')}>Gantt</span>}
        </span>
    );
}
