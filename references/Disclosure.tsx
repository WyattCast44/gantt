import { useState } from 'react';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

interface DisclosureProps {
    label: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export default function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-t border-border/30 dark:border-border-dark/30">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex w-full items-center gap-2 rounded-md px-4 py-3 text-left text-sm text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-300',
                    focusRingNeutral,
                )}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                >
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
                {label}
            </button>
            {open && children}
        </div>
    );
}
