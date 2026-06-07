import Button, { ButtonLink } from '@/components/ui/button';
import Fieldset, { FieldRow } from '@/components/ui/fieldset';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import PageHeader from '@/components/ui/page-header';
import Textarea from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { index as projectsIndex, store as projectsStore } from '@/routes/projects';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function Create() {
    const form = useForm({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(projectsStore.url());
    };

    return (
        <AppLayout title="New project">
            <form onSubmit={submit} className="mx-auto flex max-w-2xl flex-col gap-6">
                <PageHeader title="New project" description="Create a workspace to plan an operational test campaign." />

                <Fieldset
                    footer={
                        <>
                            <ButtonLink href={projectsIndex.url()} variant="secondary">
                                Cancel
                            </ButtonLink>
                            <Button type="submit" disabled={form.processing}>
                                Create project
                            </Button>
                        </>
                    }
                >
                    <FieldRow label="Name" htmlFor="name" required>
                        <Input
                            id="name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            required
                            autoFocus
                        />
                        <InputError message={form.errors.name} className="mt-1" />
                    </FieldRow>

                    <FieldRow label="Description" htmlFor="description">
                        <Textarea
                            id="description"
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            placeholder="What is this campaign about?"
                        />
                        <InputError message={form.errors.description} className="mt-1" />
                    </FieldRow>

                    <FieldRow label="Start date" htmlFor="start_date">
                        <Input
                            id="start_date"
                            type="date"
                            value={form.data.start_date}
                            onChange={(event) => form.setData('start_date', event.target.value)}
                        />
                        <InputError message={form.errors.start_date} className="mt-1" />
                    </FieldRow>

                    <FieldRow label="End date" htmlFor="end_date">
                        <Input
                            id="end_date"
                            type="date"
                            value={form.data.end_date}
                            onChange={(event) => form.setData('end_date', event.target.value)}
                        />
                        <InputError message={form.errors.end_date} className="mt-1" />
                    </FieldRow>
                </Fieldset>
            </form>
        </AppLayout>
    );
}
