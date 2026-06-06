import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Label from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function Register() {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(store.url(), {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Create Account" description="Set up a new account to start planning.">
            <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        name="name"
                        size="lg"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                    />
                    <InputError message={form.errors.name} />
                </div>

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
                        autoComplete="new-password"
                    />
                    <InputError message={form.errors.password} />
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <Input
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        size="lg"
                        value={form.data.password_confirmation}
                        onChange={(event) => form.setData('password_confirmation', event.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <InputError message={form.errors.password_confirmation} />
                </div>

                <Button type="submit" disabled={form.processing} className="w-full">
                    Create Account
                </Button>
            </form>

            <div className="mt-3 text-xs text-gray-600 dark:text-neutral-400">
                Already have an account?{' '}
                <Link href={login.url()} className="text-accent-600 hover:underline dark:text-accent-400">
                    Sign in
                </Link>
            </div>
        </AuthLayout>
    );
}
