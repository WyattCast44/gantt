import { useCallback, useState } from 'react';
import { router } from '@inertiajs/react';
import type { Credential, DecryptedCredential } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { useSidePanel } from '@/Contexts/SidePanelContext';
import ConfirmDialog from '@/Components/ConfirmDialog';
import CredentialForm from '@/Components/CredentialForm';
import { cn } from '@/utils/cn';
import { focusRingIcon, focusRingNeutral } from '@/utils/focusRing';

interface Props {
    credentialBasePath: string;
    credential: Credential | null;
    canManage: boolean;
    removeDescription?: string;
    rowIcon?: LucideIcon;
    showRowIcon?: boolean;
}

export default function CredentialDetailsSection({
    credentialBasePath,
    credential,
    canManage,
    removeDescription = 'This will remove the saved login credentials for this account.',
    rowIcon,
    showRowIcon = false,
}: Props) {
    return (
        <>
            {credential?.url && (
                <CredentialUrlRow url={credential.url} />
            )}
            {credential?.username && (
                <CredentialCopyRow label="Username" value={credential.username} />
            )}
            {credential?.has_password && (
                <CredentialPasswordRow credentialBasePath={credentialBasePath} />
            )}
            {canManage && (
                <CredentialActions
                    credentialBasePath={credentialBasePath}
                    credential={credential}
                    removeDescription={removeDescription}
                    rowIcon={rowIcon}
                    showRowIcon={showRowIcon}
                />
            )}
        </>
    );
}

function CredentialUrlRow({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [url]);

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-slate-500 dark:text-neutral-400">Login URL</dt>
            <dd className="flex items-center gap-1.5">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
                >
                    {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
                <InlineIconButton onClick={handleCopy} title="Copy URL">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </InlineIconButton>
                <InlineIconButton onClick={() => window.open(url, '_blank')} title="Open in browser">
                    <ExternalLinkIcon />
                </InlineIconButton>
            </dd>
        </div>
    );
}

function CredentialCopyRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [value]);

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-slate-500 dark:text-neutral-400">{label}</dt>
            <dd className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
                <InlineIconButton onClick={handleCopy} title={`Copy ${label.toLowerCase()}`}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </InlineIconButton>
            </dd>
        </div>
    );
}

function CredentialPasswordRow({ credentialBasePath }: { credentialBasePath: string }) {
    const [decrypted, setDecrypted] = useState<DecryptedCredential | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchCredential = useCallback(async () => {
        if (decrypted) {
            return decrypted;
        }
        setLoading(true);
        try {
            const res = await fetch(`/${credentialBasePath}/credential`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setDecrypted(data.credential);
            return data.credential as DecryptedCredential;
        } finally {
            setLoading(false);
        }
    }, [credentialBasePath, decrypted]);

    async function handleToggle() {
        if (!showPassword) {
            await fetchCredential();
        }
        setShowPassword(!showPassword);
    }

    async function handleCopy() {
        const cred = await fetchCredential();
        if (cred?.password) {
            navigator.clipboard.writeText(cred.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    }

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-slate-500 dark:text-neutral-400">Password</dt>
            <dd className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                    {showPassword && decrypted?.password ? decrypted.password : '••••••••'}
                </span>
                <InlineIconButton onClick={handleToggle} title={showPassword ? 'Hide' : 'Reveal'} disabled={loading}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </InlineIconButton>
                <InlineIconButton onClick={handleCopy} title="Copy password" disabled={loading}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </InlineIconButton>
            </dd>
        </div>
    );
}

function CredentialActions({
    credentialBasePath,
    credential,
    removeDescription,
    rowIcon: RowIcon,
    showRowIcon,
}: {
    credentialBasePath: string;
    credential: Credential | null;
    removeDescription: string;
    rowIcon?: LucideIcon;
    showRowIcon: boolean;
}) {
    const { openPanel } = useSidePanel();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    function handleEdit() {
        openPanel(
            credential ? 'Edit Credential' : 'Add Credential',
            <CredentialForm credentialBasePath={credentialBasePath} credential={credential} isUpdate={!!credential} />,
        );
    }

    return (
        <>
            <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-sm text-slate-500 dark:text-neutral-400">
                    <span className="inline-flex items-center gap-1.5">
                        {showRowIcon && RowIcon ? (
                            <RowIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-neutral-500" aria-hidden />
                        ) : null}
                        <span>Credentials</span>
                    </span>
                </dt>
                <dd className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleEdit}
                        className={cn(
                            'rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
                            focusRingNeutral,
                        )}
                    >
                        {credential ? 'Edit' : 'Add'}
                    </button>
                    {credential && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={cn(
                                'rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/50 dark:hover:text-red-400',
                                focusRingNeutral,
                            )}
                        >
                            Remove
                        </button>
                    )}
                </dd>
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onConfirm={() => router.delete(`/${credentialBasePath}/credential`)}
                onCancel={() => setShowDeleteConfirm(false)}
                title="Remove credential?"
                description={removeDescription}
                confirmLabel="Remove"
                confirmVariant="danger"
            />
        </>
    );
}

function InlineIconButton({ onClick, title, disabled, children }: {
    onClick: () => void;
    title: string;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'rounded-md p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-300',
                focusRingIcon,
            )}
            title={title}
        >
            {children}
        </button>
    );
}

function CopyIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V9a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 9V3.5Z" />
            <path d="M3 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 3 14h6a1.5 1.5 0 0 0 1.5-1.5V12H7a3 3 0 0 1-3-3V5H3Z" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-emerald-500">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.56 7.003 7.003 0 0 1 13.24 0 .87.87 0 0 1 0 .56 7.003 7.003 0 0 1-13.24 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l10.5 10.5a.75.75 0 1 0 1.06-1.06l-1.527-1.527A7.022 7.022 0 0 0 15.12 8.28a.87.87 0 0 0 0-.56 7.003 7.003 0 0 0-9.845-3.725L3.28 2.22Zm4.26 4.26 2.97 2.97A3 3 0 0 0 7.54 6.48Z" clipRule="evenodd" />
            <path d="M.88 8.28a.87.87 0 0 1 0-.56 7.003 7.003 0 0 1 2.49-3.2l1.07 1.07A5.503 5.503 0 0 0 2.5 8c.94 2.2 3.2 3.75 5.5 3.75.63 0 1.24-.1 1.8-.3l1.09 1.09A7.003 7.003 0 0 1 .88 8.28Z" />
        </svg>
    );
}

function ExternalLinkIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M8.987 1.5a.75.75 0 0 0 0 1.5h3.452L6.47 8.97a.75.75 0 1 0 1.06 1.06L13.5 4.06v3.452a.75.75 0 0 0 1.5 0V1.75a.25.25 0 0 0-.25-.25H8.987Z" />
            <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h3a.75.75 0 0 0 0-1.5h-3A3 3 0 0 0 1.5 3.5v9A3 3 0 0 0 4.5 15.5h9a3 3 0 0 0 3-3v-3a.75.75 0 0 0-1.5 0v3A1.5 1.5 0 0 1 13.5 14h-9A1.5 1.5 0 0 1 3 12.5v-9Z" />
        </svg>
    );
}
