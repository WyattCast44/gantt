import { forwardRef, useCallback, useId, useRef } from 'react';
import type { ComponentPropsWithoutRef, MutableRefObject, Ref } from 'react';
import { Slash } from 'lucide-react';
import Input from '@/Components/Input';
import { SidebarTooltip } from '@/Components/SidebarTooltip';
import { cn } from '@/utils/cn';

export type SearchInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, 'type'> & {
    type?: 'search';
};

function assignRef<T>(el: T | null, ref: Ref<T> | undefined): void {
    if (ref == null) {
        return;
    }
    if (typeof ref === 'function') {
        ref(el);
    } else {
        (ref as MutableRefObject<T | null>).current = el;
    }
}

const TOOLTIP_LABEL = 'Press / to focus';

/**
 * Search field with an inset slash shortcut hint; hover shows full help (see SidebarTooltip / useSlashFocus).
 */
const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    (
        { className, placeholder = 'Search…', size = 'md', 'aria-describedby': ariaDescribedBy, ...props },
        ref,
    ) => {
        const isLg = size === 'lg';
        const hintId = useId();
        const describedBy = [hintId, ariaDescribedBy].filter(Boolean).join(' ');
        const inputRef = useRef<HTMLInputElement | null>(null);

        const setInputRef = useCallback(
            (el: HTMLInputElement | null) => {
                inputRef.current = el;
                assignRef(el, ref);
            },
            [ref],
        );

        return (
            <div className={cn('group relative', className)}>
                <span id={hintId} className="sr-only">
                    Press the slash key to move focus to this search field from elsewhere on the page.
                </span>
                <Input
                    ref={setInputRef}
                    type="search"
                    size={size}
                    placeholder={placeholder}
                    className={cn('w-full', isLg ? 'pr-10' : 'pr-9')}
                    aria-describedby={describedBy}
                    {...props}
                />
                <div className="pointer-events-none absolute inset-y-px right-1 z-10 flex items-center">
                    <SidebarTooltip
                        enabled
                        placement="bottom"
                        label={TOOLTIP_LABEL}
                        className="!inline-flex !w-auto shrink-0"
                    >
                        <span
                            tabIndex={-1}
                            className={cn(
                                'pointer-events-auto flex cursor-default items-center justify-center rounded-md text-slate-400',
                                'hover:bg-slate-100/90 hover:text-slate-700 dark:hover:bg-neutral-800/90 dark:hover:text-neutral-200',
                                'group-focus-within:text-accent-600 dark:group-focus-within:text-accent-400',
                                isLg ? 'h-8 w-8' : 'h-7 w-7',
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                inputRef.current?.focus();
                            }}
                        >
                            <Slash
                                className={cn(
                                    'shrink-0',
                                    isLg ? 'h-4 w-3.5' : 'h-3.5 w-3',
                                )}
                                strokeWidth={2}
                                aria-hidden
                            />
                            <span className="sr-only">Slash keyboard shortcut</span>
                        </span>
                    </SidebarTooltip>
                </div>
            </div>
        );
    },
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
