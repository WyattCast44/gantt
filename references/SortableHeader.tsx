import type { Column, RowData } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

interface SortableHeaderProps<TData extends RowData> {
    column: Column<TData, unknown>;
    children: React.ReactNode;
    className?: string;
}

export default function SortableHeader<TData extends RowData>({
    column,
    children,
    className,
}: SortableHeaderProps<TData>) {
    const sorted = column.getIsSorted();

    return (
        <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className={cn(
                'inline-flex items-center gap-1 rounded-sm',
                focusRingNeutral,
                className,
            )}
        >
            {children}
            {sorted === 'asc' ? (
                <ChevronUp className="h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
                <ChevronDown className="h-3.5 w-3.5" />
            ) : (
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
            )}
        </button>
    );
}
