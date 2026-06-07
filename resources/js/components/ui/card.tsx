import { cn } from '@/utils/cn';
import { type HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
    padding?: 'default' | 'none';
};

export default function Card({ className = '', padding = 'default', ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-white dark:border-border-dark dark:bg-neutral-900',
                padding === 'default' && 'p-5',
                className,
            )}
            {...props}
        />
    );
}
