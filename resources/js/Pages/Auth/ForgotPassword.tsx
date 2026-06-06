import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Label from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { email as requestReset } from '@/routes/password';
import { Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const form = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(requestReset.url());
    };

    return (
        <AuthLayout
            title="Forgot Password"
            description="Enter your email and we'll send a password reset link."
        >
            {status && <p className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">{status}</p>}

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                    />
                    <InputError message={form.errors.email} />
                </div>

                <Button type="submit" disabled={form.processing} className="w-full">
                    Email Reset Link
                </Button>
            </form>

            <div className="mt-4 text-sm">
                <Link href={login.url()} className="text-blue-600 hover:underline dark:text-blue-400">
                    Back to sign in
                </Link>
            </div>
        </AuthLayout>
    );
}
