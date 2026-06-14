import { barPalette } from '@/Pages/Timeline/Partials/barAppearance';
import { useGanttStore } from '@/stores/useGanttStore';
import { type Task } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingInputMd } from '@/utils/focusRing';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Most matches we render at once — keeps the dropdown scannable on big trees. */
const MAX_RESULTS = 20;

type SearchHit = {
    task: Task;
    /** Ancestor names, root first, for disambiguating same-named tasks. */
    breadcrumb: string;
};

/** Flatten the tree into hits whose name contains `query` (case-insensitive). */
function findMatches(roots: Task[], query: string): SearchHit[] {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return [];
    }

    const hits: SearchHit[] = [];

    const walk = (tasks: Task[], trail: string[]): void => {
        for (const task of tasks) {
            if (hits.length < MAX_RESULTS && task.name.toLowerCase().includes(needle)) {
                hits.push({ task, breadcrumb: trail.join(' / ') });
            }

            if (task.children.length > 0) {
                walk(task.children, [...trail, task.name]);
            }
        }
    };

    walk(roots, []);

    return hits;
}

/**
 * Type-ahead task finder for the timeline. Searches the whole tree (not just
 * the visible rows), and selecting a hit reveals and frames it via the store's
 * focusTask — expanding collapsed ancestors and scrolling the bar into view.
 */
export default function TimelineSearch() {
    const tasks = useGanttStore((state) => state.tasks);
    const focusTask = useGanttStore((state) => state.focusTask);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const matches = useMemo(() => findMatches(tasks, query), [tasks, query]);

    // Keep the active row in range as results change under the cursor.
    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    // Press "/" anywhere on the timeline to jump to the search box (unless
    // already typing in a field).
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target;

            if (target instanceof Element && target.closest('[contenteditable="true"], input, textarea, select')) {
                return;
            }

            event.preventDefault();
            inputRef.current?.focus();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // Close the dropdown on an outside click.
    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent): void => {
            if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const select = (hit: SearchHit): void => {
        focusTask(hit.task.id);
        setOpen(false);
        inputRef.current?.blur();
    };

    const clear = (): void => {
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(matches.length - 1, index + 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (matches[activeIndex] !== undefined) {
                select(matches[activeIndex]);
            }
        } else if (event.key === 'Escape') {
            if (query !== '') {
                event.preventDefault();
                clear();
            } else {
                setOpen(false);
                inputRef.current?.blur();
            }
        }
    };

    const showDropdown = open && query.trim() !== '';

    return (
        <div ref={containerRef} className="relative">
            <Search
                className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                aria-hidden
            />
            <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="timeline-search-results"
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Find a task…"
                aria-label="Find a task"
                data-testid="timeline-search"
                className={cn(
                    'h-8 w-full rounded-md border border-border bg-white pr-7 pl-8 text-sm text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-accent-400',
                    '[&::-webkit-search-cancel-button]:hidden',
                    focusRingInputMd,
                )}
            />
            {query !== '' && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear search"
                    className={cn(
                        'absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200',
                        focusRingInputMd,
                    )}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}

            {showDropdown && (
                <ul
                    id="timeline-search-results"
                    role="listbox"
                    className="absolute top-full left-0 z-30 mt-1 max-h-80 w-80 overflow-auto rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-900"
                >
                    {matches.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-500 dark:text-neutral-400">No matching tasks.</li>
                    ) : (
                        matches.map((hit, index) => (
                            <li key={hit.task.id} role="option" aria-selected={index === activeIndex}>
                                <button
                                    type="button"
                                    // Use onMouseDown so the click lands before the input's
                                    // blur tears the dropdown down.
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        select(hit);
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={cn(
                                        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left',
                                        index === activeIndex && 'bg-accent-50 dark:bg-accent-950',
                                    )}
                                >
                                    <span
                                        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', barPalette(hit.task.status.value).fill)}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm text-slate-700 dark:text-neutral-200">
                                            {hit.task.name}
                                        </span>
                                        {hit.breadcrumb !== '' && (
                                            <span className="block truncate text-xs text-slate-400 dark:text-neutral-500">
                                                {hit.breadcrumb}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
