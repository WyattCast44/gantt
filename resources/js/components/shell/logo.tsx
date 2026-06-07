import { cn } from '@/utils/cn';

type LogoSize = 'default' | 'lg';

const logoSizes: Record<LogoSize, { icon: string; text: string }> = {
    default: { icon: 'h-6 w-7', text: 'text-base font-semibold' },
    lg: { icon: 'h-9 w-10', text: 'text-2xl font-semibold' },
};

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
            className={cn('shrink-0', className)}
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
            <rect x="5" y="3" width="18" height="3.5" rx="1" className="fill-blue-500" />
            <rect x="5" y="8.5" width="13" height="3.5" rx="1" className="fill-teal-500" />
            <rect x="5" y="14" width="9" height="3.5" rx="1" className="fill-violet-500" />
            <rect x="5" y="19.5" width="5" height="3.5" rx="1" className="fill-rose-400" />
        </svg>
    );
}

export default function Logo({ collapsed = false, size = 'default', className }: LogoProps) {
    const styles = logoSizes[size];

    return (
        <span className={cn('flex items-center gap-2.5 text-slate-900 dark:text-white', className)}>
            <LogoIcon className={styles.icon} />
            {!collapsed && <span className={cn(styles.text, 'tracking-tight')}>Gantt</span>}
        </span>
    );
}
