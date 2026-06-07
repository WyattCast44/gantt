import Label from '@/Components/Label';

interface FormFieldProps {
    label: string;
    error?: string;
    required?: boolean;
    htmlFor?: string;
    horizontal?: boolean;
    children: React.ReactNode;
}

export default function FormField({ label, error, required, htmlFor, horizontal, children }: FormFieldProps) {
    if (horizontal) {
        return (
            <div className="flex items-center gap-4">
                <Label htmlFor={htmlFor} required={required} className="mb-0 w-36 shrink-0">
                    {label}
                </Label>
                <div className="min-w-0 flex-1">
                    {children}
                    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div>
            <Label htmlFor={htmlFor} required={required}>
                {label}
            </Label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
