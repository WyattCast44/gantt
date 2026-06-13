import Button, { type ButtonHTMLAttributes } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';

export const toolbarGroupClass =
    'inline-flex h-8 items-stretch overflow-hidden rounded-md border border-border shadow-sm dark:border-border-dark';

export function toolbarSegmentClass(isLast: boolean, className?: string): string {
    return cn(
        'h-full rounded-none border-0 py-0 leading-none shadow-none',
        !isLast && 'border-r border-border dark:border-border-dark',
        className,
    );
}

type ToolbarButtonGroupProps = {
    'aria-label'?: string;
    children: ReactNode;
};

/** Bordered container for segmented secondary buttons in the timeline toolbar. */
export function ToolbarButtonGroup({ children, 'aria-label': ariaLabel }: ToolbarButtonGroupProps) {
    return (
        <div className={toolbarGroupClass} role="group" aria-label={ariaLabel}>
            {children}
        </div>
    );
}

export function ToolbarGroupButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button variant="secondary" size="sm" className={cn('items-center py-0', className)} {...props} />;
}

/** Tooltip wrapper that fills a segmented toolbar cell so button labels stay vertically centered. */
export function ToolbarTooltip({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Tooltip label={label} className="flex h-full">
            <span className="flex h-full">{children}</span>
        </Tooltip>
    );
}
