import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Label from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { focusRingCheckbox } from '@/utils/focusRing';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function Login({ status }: { status?: string }) {
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(store.url(), {
            onFinish: () => form.reset('password'),
        });
    };

    return (
        <AuthLayout title="Sign In" description="Sign in to your account to continue.">
            {status && <p className="mb-3 text-sm font-medium text-green-600 dark:text-green-400">{status}</p>}

            <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        size="lg"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                    />
                    <InputError message={form.errors.email} />
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        size="lg"
                        value={form.data.password}
                        onChange={(event) => form.setData('password', event.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <InputError message={form.errors.password} />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-neutral-400">
                    <input
                        type="checkbox"
                        checked={form.data.remember}
                        onChange={(event) => form.setData('remember', event.target.checked)}
                        className={focusRingCheckbox}
                    />
                    Remember me
                </label>

                <Button type="submit" disabled={form.processing} className="w-full">
                    Sign In
                </Button>
            </form>

            <div className="mt-3 flex items-center justify-between text-xs">
                <Link href={request.url()} className="text-accent-600 hover:underline dark:text-accent-400">
                    Forgot password?
                </Link>
                <Link href={register.url()} className="text-accent-600 hover:underline dark:text-accent-400">
                    Create account
                </Link>
            </div>
        </AuthLayout>
    );
}
