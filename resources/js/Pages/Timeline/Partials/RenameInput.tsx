import { useEffect, useRef } from 'react';

type RenameInputProps = {
    value: string;
    onChange: (value: string) => void;
    /** Commit the new name (Enter or blur). */
    onCommit: () => void;
    onCancel: () => void;
};

/**
 * The inline rename input swapped in for a task's name on the timeline (F2 or
 * context menu). Pre-selected so typing replaces; Enter/blur commits, Esc
 * reverts.
 */
export default function RenameInput({ value, onChange, onCommit, onCancel }: RenameInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const settled = useRef(false);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            settled.current = true;
            onCommit();

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            settled.current = true;
            onCancel();
        }
    };

    return (
        <input
            ref={inputRef}
            data-testid="rename-input"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
                if (!settled.current) {
                    onCommit();
                }
            }}
            aria-label="Task name"
            className="min-w-0 flex-1 rounded-sm border-0 bg-transparent p-0 text-sm text-slate-700 focus:ring-0 focus:outline-none dark:text-neutral-200"
        />
    );
}
