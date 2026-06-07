import { useEffect, useState } from 'react';
import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import type { EmailMessageView } from '@/types';

interface EmailViewerPanelProps {
    emailId: number;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function EmailViewerPanel({ emailId }: EmailViewerPanelProps) {
    const [email, setEmail] = useState<EmailMessageView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setEmail(null);
        setError(null);
        setLoading(true);

        fetch(`/emails/${emailId}`, { headers: { Accept: 'application/json' } })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('load failed');
                }
                return res.json();
            })
            .then((body) => {
                if (active) {
                    setEmail(body.email as EmailMessageView);
                }
            })
            .catch(() => {
                if (active) {
                    setError('Could not load this email.');
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [emailId]);

    if (loading) {
        return (
            <div className="space-y-3 p-4">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="mt-6 h-40 animate-pulse rounded bg-slate-100 dark:bg-neutral-900" />
            </div>
        );
    }

    if (error || !email) {
        return (
            <div className="p-4">
                <EmptyState dashed message={error ?? 'Could not load this email.'} />
            </div>
        );
    }

    return (
        <article className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 space-y-1 border-b border-border px-4 py-3 dark:border-border-dark">
                <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-white">
                    {email.subject ?? '(no subject)'}
                </h2>
                <div className="text-sm text-slate-600 dark:text-neutral-300">
                    <span className="font-medium">{email.from_name ?? email.from_email}</span>
                    {email.from_name && email.from_email && (
                        <span className="text-slate-400 dark:text-neutral-500">
                            {' '}
                            &lt;{email.from_email}&gt;
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 dark:text-neutral-500">
                    {email.sent_at && <span>{formatDate(email.sent_at)}</span>}
                    {email.to && email.to.length > 0 && (
                        <span className="min-w-0 truncate">To: {email.to.join(', ')}</span>
                    )}
                    {email.cc && email.cc.length > 0 && (
                        <span className="min-w-0 truncate">Cc: {email.cc.join(', ')}</span>
                    )}
                </div>
                {email.attachments && email.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {email.attachments.map((a, i) => (
                            <Badge key={i} variant="default">
                                {a.filename ?? 'attachment'}
                            </Badge>
                        ))}
                    </div>
                )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {email.body_text ? (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700 dark:text-neutral-200">
                        {email.body_text}
                    </pre>
                ) : email.body_html ? (
                    <iframe
                        title="Email body"
                        sandbox=""
                        srcDoc={email.body_html}
                        className="h-full min-h-[20rem] w-full rounded-md border border-border bg-white dark:border-border-dark dark:bg-white"
                    />
                ) : (
                    <p className="text-sm text-slate-400 dark:text-neutral-500">No content.</p>
                )}
            </div>
        </article>
    );
}
