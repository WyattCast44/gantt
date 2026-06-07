import { cn } from '@/utils/cn';

type AvatarProps = {
    name: string;
    className?: string;
};

function initialsFor(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((word) => word[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function Avatar({ name, className }: AvatarProps) {
    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300',
                className,
            )}
        >
            {initialsFor(name)}
        </span>
    );
}
