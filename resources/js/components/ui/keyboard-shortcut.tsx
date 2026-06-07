import { cn } from '@/utils/cn';
import { useSyncExternalStore } from 'react';

function subscribe(): () => void {
    return () => {};
}

function getIsMac(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;

    return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) || uaData?.platform === 'macOS';
}

type KeyboardShortcutProps = {
    /** Letter or key shown after the modifier, e.g. "K". */
    letter: string;
    className?: string;
};

export default function KeyboardShortcut({ letter, className }: KeyboardShortcutProps) {
    const isMac = useSyncExternalStore(subscribe, getIsMac, () => false);

    return (
        <kbd
            className={cn(
                'inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 bg-slate-100/90 px-1.5 font-sans text-[10px] font-medium text-slate-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500',
                className,
            )}
        >
            <span aria-hidden>{isMac ? '⌘' : 'Ctrl'}</span>
            <span>{letter}</span>
        </kbd>
    );
}
