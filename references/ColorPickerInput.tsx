import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

const FALLBACK_HEX = '#64748b';

/**
 * Normalizes a value for use with {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color `<input type="color">`},
 * which requires a 7-character `#rrggbb` string.
 */
export function normalizeHexForColorInput(value: string | null | undefined): string {
    if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
        return value;
    }

    return FALLBACK_HEX;
}

interface ColorPickerInputProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'size'
> {
    value: string | null | undefined;
    onChange: (hex: string) => void;
    size?: 'md' | 'lg';
    showHexLabel?: boolean;
}

const swatchSizeClasses = {
    md: 'h-8 w-10 min-w-10',
    lg: 'h-10 w-12 min-w-12',
};

const ColorPickerInput = forwardRef<HTMLInputElement, ColorPickerInputProps>(
    ({ value, onChange, size = 'md', showHexLabel = true, className, disabled, id, ...rest }, ref) => {
        const pickerValue = normalizeHexForColorInput(value);

        return (
            <div className={cn('inline-flex items-center gap-2', className)}>
                <input
                    ref={ref}
                    id={id}
                    type="color"
                    value={pickerValue}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={cn(
                        'cursor-pointer rounded border border-border bg-white p-0.5 shadow-sm dark:border-border-dark dark:bg-neutral-800',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        swatchSizeClasses[size],
                        '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0',
                    )}
                    {...rest}
                />
                {showHexLabel && (
                    <span
                        className="font-mono text-xs tabular-nums text-slate-500 dark:text-neutral-400"
                        aria-hidden
                    >
                        {pickerValue.toUpperCase()}
                    </span>
                )}
            </div>
        );
    },
);

ColorPickerInput.displayName = 'ColorPickerInput';

export default ColorPickerInput;
