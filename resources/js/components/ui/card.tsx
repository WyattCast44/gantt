import { type HTMLAttributes } from 'react';

export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-lg border border-border bg-white p-5 dark:border-border-dark dark:bg-neutral-900 ${className}`}
            {...props}
        />
    );
}
