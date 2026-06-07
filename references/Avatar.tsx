import { useState } from 'react';
import { cn } from '@/utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: AvatarSize;
    className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-20 w-20 text-2xl',
};

const palette = [
    'bg-rose-500 text-white',
    'bg-orange-500 text-white',
    'bg-amber-500 text-white',
    'bg-emerald-500 text-white',
    'bg-teal-500 text-white',
    'bg-sky-500 text-white',
    'bg-indigo-500 text-white',
    'bg-violet-500 text-white',
    'bg-fuchsia-500 text-white',
    'bg-pink-500 text-white',
];

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '?';
    }
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + second).toUpperCase();
}

function colorForName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
}

export default function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
    const [errored, setErrored] = useState(false);
    const sizeClass = sizeClasses[size];

    if (src && !errored) {
        return (
            <img
                src={src}
                alt=""
                onError={() => setErrored(true)}
                className={cn(
                    'shrink-0 rounded-full object-cover ring-1 ring-border dark:ring-border-dark',
                    sizeClass,
                    className,
                )}
            />
        );
    }

    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none',
                colorForName(name),
                sizeClass,
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
