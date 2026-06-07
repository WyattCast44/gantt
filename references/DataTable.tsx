import type { RowData, Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { useEffect } from 'react';
import { cn } from '@/utils/cn';
import {
    tableBase,
    tableBody,
    tableBodyRow,
    tableHeadCell,
    tableHeadRow,
} from '@/utils/tableStyles';
import Card from '@/Components/Card';

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
        headerClassName?: string;
    }
}

interface DataTableProps<TData> {
    table: Table<TData>;
    onRowClick?: (row: TData) => void;
    getRowClassName?: (row: TData) => string | undefined;
    className?: string;
}

function columnWidthPercent(size: number, totalSize: number): string {
    if (totalSize <= 0) {
        return '0%';
    }

    return `${(size / totalSize) * 100}%`;
}

export default function DataTable<TData>({
    table,
    onRowClick,
    getRowClassName,
    className,
}: DataTableProps<TData>) {
    const rows = table.getRowModel().rows;
    const lastRowIndex = rows.length - 1;
    const totalSize = table.getTotalSize();
    const resizingColumnId = table.getState().columnSizingInfo.isResizingColumn;

    useEffect(() => {
        if (!resizingColumnId) {
            return;
        }
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [resizingColumnId]);

    return (
        <Card padding="none" className={cn('overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table
                    className={cn(tableBase, 'w-full table-fixed')}
                    style={{ minWidth: totalSize > 0 ? totalSize : undefined }}
                >
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className={tableHeadRow}>
                                {headerGroup.headers.map((header, headerIndex) => {
                                    const size = header.getSize();
                                    const widthPct = columnWidthPercent(size, totalSize);
                                    return (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            className={cn(
                                                tableHeadCell,
                                                'relative align-middle',
                                                headerIndex === 0 && 'rounded-tl-lg',
                                                headerIndex === headerGroup.headers.length - 1 && 'rounded-tr-lg',
                                                header.column.columnDef.meta?.headerClassName,
                                            )}
                                            style={{ width: widthPct }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div className="flex min-w-0 items-center pr-2">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </div>
                                            )}
                                            {header.column.getCanResize() && (
                                                <div
                                                    role="separator"
                                                    aria-orientation="vertical"
                                                    aria-label="Resize column"
                                                    title="Drag to resize column"
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className={cn(
                                                        'absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none',
                                                        'border-r border-transparent hover:border-accent-500/60',
                                                        'hover:bg-accent-500/25',
                                                        header.column.getIsResizing() &&
                                                            'w-2 border-r-2 border-accent-500 bg-accent-500/35 shadow-[2px_0_0_0_rgba(59,130,246,0.45)] dark:shadow-[2px_0_0_0_rgba(96,165,250,0.5)]',
                                                    )}
                                                />
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className={tableBody}>
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className={cn(
                                    tableBodyRow,
                                    onRowClick && 'cursor-pointer',
                                    getRowClassName?.(row.original),
                                )}
                                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                            >
                                {row.getVisibleCells().map((cell, cellIndex) => {
                                    const colSize = cell.column.getSize();
                                    const widthPct = columnWidthPercent(colSize, totalSize);
                                    return (
                                        <td
                                            key={cell.id}
                                            className={cn(
                                                'align-middle',
                                                rowIndex === lastRowIndex && cellIndex === 0 && 'rounded-bl-lg',
                                                rowIndex === lastRowIndex &&
                                                    cellIndex === row.getVisibleCells().length - 1 &&
                                                    'rounded-br-lg',
                                                cell.column.columnDef.meta?.className,
                                            )}
                                            style={{ width: widthPct }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
