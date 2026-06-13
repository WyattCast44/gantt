import { buttonClasses } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Keyboard } from 'lucide-react';
import { type ReactNode } from 'react';

function Key({ children }: { children: ReactNode }) {
    return (
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-slate-100/90 px-1 font-sans text-[10px] font-medium text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            {children}
        </kbd>
    );
}

function ShortcutRow({ keys, children }: { keys: string[]; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-1">
            <span className="text-sm text-slate-700 dark:text-neutral-200">{children}</span>
            <span className="flex shrink-0 gap-1">
                {keys.map((key) => (
                    <Key key={key}>{key}</Key>
                ))}
            </span>
        </div>
    );
}

/**
 * The timeline's keyboard-shortcut reference: a toolbar dropdown so the
 * hotkeys (especially quick-create) are discoverable without reading docs.
 * Editing shortcuts are hidden from viewers.
 */
export default function ShortcutsHelp({ canEdit }: { canEdit: boolean }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger aria-label="Keyboard shortcuts" className={buttonClasses('secondary', 'icon', 'h-8 w-8 p-0')}>
                <Keyboard className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" portaled className="w-80">
                {canEdit && (
                    <>
                        <DropdownMenuLabel>Create tasks</DropdownMenuLabel>
                        <ShortcutRow keys={['N']}>New task below the selection</ShortcutRow>
                        <ShortcutRow keys={['⇧', 'N']}>New subtask of the selection</ShortcutRow>
                        <ShortcutRow keys={['Tab']}>Indent the draft (subtask)</ShortcutRow>
                        <ShortcutRow keys={['↵']}>Save, then add another</ShortcutRow>
                        <ShortcutRow keys={['Esc']}>Cancel the draft</ShortcutRow>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Edit & link</DropdownMenuLabel>
                        <ShortcutRow keys={['F2']}>Rename the selection</ShortcutRow>
                        <ShortcutRow keys={['⌫']}>Delete the selection…</ShortcutRow>
                        <div className="px-3 py-1 text-sm text-slate-500 dark:text-neutral-400">
                            Drag the <span aria-hidden>◦</span> handle at the end of a bar onto another task to add a dependency.
                        </div>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuLabel>Navigate</DropdownMenuLabel>
                <ShortcutRow keys={['↑', '↓']}>Select the previous / next task</ShortcutRow>
                <ShortcutRow keys={['←', '→']}>Collapse / expand the selection</ShortcutRow>
                <ShortcutRow keys={['↵']}>Open the selected task</ShortcutRow>
                <ShortcutRow keys={['T']}>Go to today</ShortcutRow>
                <ShortcutRow keys={['D', 'W', 'M', 'Q', 'Y']}>Zoom: day / week / month / quarter / year</ShortcutRow>
                <ShortcutRow keys={['1', '–', '5']}>Fold tree to hierarchy level 1–5</ShortcutRow>
                <DropdownMenuSeparator />
                <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-neutral-400">
                    Tip: right-click tasks, bars, empty space, or dependency lines for more actions.
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
