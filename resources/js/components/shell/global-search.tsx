import KeyboardShortcut from '@/components/ui/keyboard-shortcut';
import { search as searchRoute } from '@/routes';
import { type SearchResponse, type SearchResultItem, type SharedProps } from '@/types';
import { cn } from '@/utils/cn';
import { focusRingInputMd } from '@/utils/focusRing';
import { router, usePage } from '@inertiajs/react';
import { FileText, FolderKanban, ListChecks, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

const TYPE_ICONS = {
    project: FolderKanban,
    task: ListChecks,
    document: FileText,
} as const;

/** Pull the current project id out of the active URL, if we're inside one. */
function useCurrentProjectId(): number | null {
    const url = usePage<SharedProps>().url;
    const match = /^\/projects\/(\d+)/.exec(url);

    return match ? Number(match[1]) : null;
}

export default function GlobalSearch() {
    const currentProjectId = useCurrentProjectId();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<SearchResponse | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Flattened hits in render order, so arrow keys can walk across groups.
    const flatItems = useMemo<SearchResultItem[]>(
        () => response?.groups.flatMap((group) => group.items) ?? [],
        [response],
    );

    // ⌘K / Ctrl+K focuses the search from anywhere.
    useEffect(() => {
        function onKeydown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
                setOpen(true);
            }
        }

        window.addEventListener('keydown', onKeydown);

        return () => window.removeEventListener('keydown', onKeydown);
    }, []);

    // Close when clicking outside the search.
    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        window.addEventListener('pointerdown', onPointerDown);

        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    // Debounced fetch; stale responses are dropped via AbortController.
    useEffect(() => {
        const trimmed = query.trim();

        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResponse(null);
            setLoading(false);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        const timer = window.setTimeout(() => {
            fetch(
                searchRoute.url({
                    query: { q: trimmed, project: currentProjectId ?? undefined },
                }),
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((res) => res.json() as Promise<SearchResponse>)
                .then((data) => {
                    setResponse(data);
                    setActiveIndex(0);
                })
                .catch((error: unknown) => {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        setResponse({ query: trimmed, groups: [] });
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [query, currentProjectId]);

    function goTo(item: SearchResultItem) {
        setOpen(false);
        setQuery('');
        setResponse(null);
        inputRef.current?.blur();
        router.visit(item.url);
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();

            return;
        }

        if (flatItems.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % flatItems.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => (index - 1 + flatItems.length) % flatItems.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const item = flatItems[activeIndex];

            if (item) {
                goTo(item);
            }
        }
    }

    const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;
    const hasResults = flatItems.length > 0;

    return (
        <div ref={containerRef} className="relative hidden w-56 md:block lg:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="global-search-results"
                aria-label="Search across all projects (⌘K or Ctrl+K)"
                className={cn(
                    'block w-full rounded-md border border-border bg-slate-50 py-1.5 pr-14 pl-8 text-sm text-slate-700 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-neutral-200',
                    focusRingInputMd,
                )}
            />
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <KeyboardShortcut letter="K" />
            </div>

            {showDropdown && (
                <div
                    id="global-search-results"
                    role="listbox"
                    className="absolute right-0 left-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-white py-1 shadow-lg dark:border-border-dark dark:bg-neutral-900"
                >
                    {loading && !hasResults && <SearchSkeleton />}

                    {!loading && !hasResults && (
                        <p className="px-3 py-4 text-center text-sm text-slate-400 dark:text-neutral-500">No matches found.</p>
                    )}

                    {hasResults &&
                        response?.groups.map((group) => (
                            <div key={group.type} className="py-1">
                                <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">
                                    {group.label}
                                </p>
                                {group.items.map((item) => {
                                    const index = flatItems.indexOf(item);
                                    const Icon = TYPE_ICONS[item.type];

                                    return (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            type="button"
                                            role="option"
                                            aria-selected={index === activeIndex}
                                            onPointerEnter={() => setActiveIndex(index)}
                                            onClick={() => goTo(item)}
                                            className={cn(
                                                'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm',
                                                index === activeIndex
                                                    ? 'bg-slate-100 dark:bg-neutral-800'
                                                    : 'hover:bg-slate-50 dark:hover:bg-neutral-800/60',
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-slate-700 dark:text-neutral-200">{item.title}</span>
                                                {item.subtitle && (
                                                    <span className="block truncate text-xs text-slate-400 dark:text-neutral-500">
                                                        {item.subtitle}
                                                    </span>
                                                )}
                                            </span>
                                            {item.classification !== 'Unclassified' && (
                                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
                                                    {item.classification}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}

function SearchSkeleton() {
    return (
        <div className="space-y-2 px-3 py-2" aria-hidden>
            {[0, 1, 2].map((row) => (
                <div key={row} className="h-7 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
            ))}
        </div>
    );
}
