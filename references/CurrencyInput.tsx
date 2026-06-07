import { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { focusRingInputLg, focusRingInputMd } from '@/utils/focusRing';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> {
    /** Raw numeric string (e.g. "1234.56") — what gets stored in the form */
    value: string;
    /** Called with the raw numeric string on change */
    onChange: (value: string) => void;
    /** ISO 4217 currency code (default: USD) */
    currency?: string;
    /** Input size variant */
    size?: 'md' | 'lg';
    /** Allow negative values */
    allowNegative?: boolean;
}

const sizeClasses = {
    md: cn('rounded-md py-1.5 shadow-sm', focusRingInputMd),
    lg: cn('rounded-lg py-2 shadow-sm', focusRingInputLg),
};

/** Parse a formatted display string back to a raw numeric string */
function parseToRaw(display: string, allowNegative: boolean): string {
    // Strip everything except digits, decimal point, and minus
    let raw = display.replace(/[^0-9.\-]/g, '');

    // Handle negatives
    const isNegative = allowNegative && raw.startsWith('-');
    raw = raw.replace(/-/g, '');

    // Only keep the first decimal point
    const parts = raw.split('.');
    if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
        raw = parts[0] + '.' + parts[1].slice(0, 2);
    }

    // Strip leading zeros (but keep "0" and "0.xx")
    if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
        raw = raw.replace(/^0+/, '') || '0';
    }

    if (isNegative && raw !== '0' && raw !== '') {
        raw = '-' + raw;
    }

    return raw;
}

/** Format a raw numeric string for display with commas and currency symbol */
function formatForDisplay(raw: string, currency: string): string {
    if (raw === '' || raw === '-') return raw;

    const isNegative = raw.startsWith('-');
    let abs = isNegative ? raw.slice(1) : raw;

    // Split integer and decimal
    const dotIndex = abs.indexOf('.');
    let intPart = dotIndex >= 0 ? abs.slice(0, dotIndex) : abs;
    const decPart = dotIndex >= 0 ? abs.slice(dotIndex) : ''; // includes the dot

    if (intPart === '') intPart = '0';

    // Add thousands separators
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const symbol = getCurrencySymbol(currency);
    const formatted = intPart + decPart;

    if (isNegative) {
        return '-' + symbol + formatted;
    }
    return symbol + formatted;
}

const symbolCache = new Map<string, string>();

function getCurrencySymbol(currency: string): string {
    if (!symbolCache.has(currency)) {
        try {
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(0);
            // Extract just the symbol (everything that isn't a digit)
            const symbol = formatted.replace(/[\d\s]/g, '').trim();
            symbolCache.set(currency, symbol);
        } catch {
            symbolCache.set(currency, '$');
        }
    }
    return symbolCache.get(currency)!;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onChange, currency = 'USD', size = 'md', allowNegative = false, className, onFocus, onBlur, ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value, currency));
        const innerRef = useRef<HTMLInputElement>(null);

        // Sync display when value changes externally (not during editing)
        useEffect(() => {
            if (!isFocused) {
                setDisplayValue(formatForDisplay(value, currency));
            }
        }, [value, currency, isFocused]);

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.target;
            const rawInput = input.value;

            // Parse to raw numeric
            const raw = parseToRaw(rawInput, allowNegative);

            // Format for display
            const formatted = formatForDisplay(raw, currency);

            // Calculate where the cursor should be after formatting
            const prevCursorPos = input.selectionStart ?? 0;
            const prevLength = rawInput.length;

            setDisplayValue(formatted);
            onChange(raw);

            // Restore cursor position accounting for added/removed formatting chars
            requestAnimationFrame(() => {
                const el = innerRef.current;
                if (!el) return;

                const lengthDiff = formatted.length - prevLength;
                const newPos = Math.max(0, prevCursorPos + lengthDiff);
                el.setSelectionRange(newPos, newPos);
            });
        }, [onChange, currency, allowNegative]);

        const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);

            // Select all text on focus for easy replacement
            requestAnimationFrame(() => {
                e.target.select();
            });

            onFocus?.(e);
        }, [onFocus]);

        const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);

            // Normalize: ensure 2 decimal places on blur
            let raw = parseToRaw(e.target.value, allowNegative);
            if (raw === '' || raw === '-') raw = '0';

            // Add .00 or pad decimal
            if (!raw.includes('.')) {
                raw = raw + '.00';
            } else {
                const [int, dec] = raw.split('.');
                raw = int + '.' + (dec || '').padEnd(2, '0');
            }

            onChange(raw);
            setDisplayValue(formatForDisplay(raw, currency));

            onBlur?.(e);
        }, [onChange, currency, allowNegative, onBlur]);

        // Merge refs
        const setRefs = useCallback((el: HTMLInputElement | null) => {
            (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
        }, [ref]);

        return (
            <input
                ref={setRefs}
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={cn(
                    'block w-full border border-border bg-white px-3 text-sm tabular-nums text-slate-900 placeholder:text-slate-400 dark:border-border-dark dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-accent-400',
                    sizeClasses[size],
                    className,
                )}
                {...props}
            />
        );
    },
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
