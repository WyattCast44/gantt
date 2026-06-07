import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import type { Credential } from '@/types';
import { useSidePanel } from '@/Contexts/SidePanelContext';
import Input from '@/Components/Input';
import Button from '@/Components/Button';
import PanelRow from '@/Components/PanelRow';
import { cn } from '@/utils/cn';
import { focusRingIcon } from '@/utils/focusRing';

interface Props {
    /** e.g. `accounts/12` or `bills/3` — credential routes are `/{credentialBasePath}/credential`. */
    credentialBasePath: string;
    credential: Credential | null;
    isUpdate: boolean;
}

export default function CredentialForm({ credentialBasePath, credential, isUpdate }: Props) {
    const { closePanel } = useSidePanel();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm({
        url: credential?.url ?? '',
        username: credential?.username ?? '',
        password: '',
    });

    const endpoint = `/${credentialBasePath}/credential`;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const options = {
            onSuccess: () => closePanel(),
            preserveScroll: true,
        };

        if (isUpdate) {
            form.put(endpoint, options);
        } else {
            form.post(endpoint, options);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-border/30 dark:divide-border-dark/30">
                    <PanelRow label="URL" error={form.errors.url}>
                        <Input
                            type="url"
                            placeholder="https://example.com/login"
                            value={form.data.url}
                            onChange={(e) => form.setData('url', e.target.value)}
                        />
                    </PanelRow>

                    <PanelRow label="Username" error={form.errors.username}>
                        <Input
                            type="text"
                            autoComplete="off"
                            value={form.data.username}
                            onChange={(e) => form.setData('username', e.target.value)}
                        />
                    </PanelRow>

                    <PanelRow label={isUpdate ? 'Password' : 'Password'} error={form.errors.password} hint={isUpdate ? 'Leave blank to keep current' : undefined}>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={cn(
                                    'absolute inset-y-0 right-0 flex items-center rounded-md pr-2 pl-1 text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300',
                                    focusRingIcon,
                                )}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l10.5 10.5a.75.75 0 1 0 1.06-1.06l-1.527-1.527A7.022 7.022 0 0 0 15.12 8.28a.87.87 0 0 0 0-.56 7.003 7.003 0 0 0-9.845-3.725L3.28 2.22Zm4.26 4.26 2.97 2.97A3 3 0 0 0 7.54 6.48Z" clipRule="evenodd" />
                                        <path d="M.88 8.28a.87.87 0 0 1 0-.56 7.003 7.003 0 0 1 2.49-3.2l1.07 1.07A5.503 5.503 0 0 0 2.5 8c.94 2.2 3.2 3.75 5.5 3.75.63 0 1.24-.1 1.8-.3l1.09 1.09A7.003 7.003 0 0 1 .88 8.28Z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                                        <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.56 7.003 7.003 0 0 1 13.24 0 .87.87 0 0 1 0 .56 7.003 7.003 0 0 1-13.24 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </PanelRow>
                </div>
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 dark:border-border-dark">
                <Button type="submit" disabled={form.processing} fullWidth>
                    {form.processing ? 'Saving...' : isUpdate ? 'Update Credential' : 'Save Credential'}
                </Button>
            </div>
        </form>
    );
}