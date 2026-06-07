interface PanelRowProps {
    label: string;
    error?: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}

export default function PanelRow({ label, error, required, hint, children }: PanelRowProps) {
    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 text-sm text-slate-500 dark:text-neutral-400">
                    {label}
                    {required && <span className="text-red-500"> *</span>}
                </label>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
            {hint && !error && <p className="mt-1 pl-[7.75rem] text-xs text-slate-400 dark:text-neutral-500">{hint}</p>}
            {error && <p className="mt-1 pl-[7.75rem] text-xs text-red-500">{error}</p>}
        </div>
    );
}
