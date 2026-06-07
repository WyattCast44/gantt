import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';

/**
 * Long notes for detail tables: preserves line breaks, clamps when collapsed, optional Show more / less.
 */
export default function CollapsibleDetailNotes({ notes }: { notes: string }) {
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setExpanded(false);
    }, [notes]);

    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el) {
            return;
        }
        if (expanded) {
            return;
        }
        setOverflows(el.scrollHeight > el.clientHeight + 1);
    }, [notes, expanded]);

    const showToggle = overflows || expanded;

    return (
        <div className="flex w-full flex-col items-end gap-1">
            <div
                ref={contentRef}
                className={cn(
                    'w-full whitespace-pre-wrap break-words text-right',
                    !expanded && 'line-clamp-4',
                )}
            >
                {notes}
            </div>
            {showToggle && (
                <button
                    type="button"
                    className={cn(
                        'rounded-md text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400',
                        focusRingNeutral,
                    )}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}
