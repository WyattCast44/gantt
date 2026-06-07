import Button from '@/components/ui/button';
import Fieldset, { FieldRow } from '@/components/ui/fieldset';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import { update as documentUpdate } from '@/routes/projects/documents';
import { CLASSIFICATIONS, type BaseClassificationValue, type Document, type Project } from '@/types';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

type EditDocumentFormProps = {
    project: Project;
    document: Document;
    options: typeof CLASSIFICATIONS;
    /** Called after a successful save (e.g. close a modal). */
    onSuccess?: () => void;
    /** When provided, a Cancel button is rendered that invokes this. */
    onCancel?: () => void;
};

/** The document metadata edit form, used on the show page's Edit tab. */
export default function EditDocumentForm({ project, document, options, onSuccess, onCancel }: EditDocumentFormProps) {
    const form = useForm<{ name: string; description: string; base_classification: BaseClassificationValue }>({
        name: document.name,
        description: document.description ?? '',
        base_classification: document.base_classification.value,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(documentUpdate.url([project.id, document.id]), {
            preserveScroll: true,
            onSuccess,
        });
    };

    return (
        <form onSubmit={submit}>
            <Fieldset
                footer={
                    <>
                        {onCancel && (
                            <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={form.processing}>
                            Save changes
                        </Button>
                    </>
                }
            >
                <FieldRow label="Name" htmlFor="edit-name" required>
                    <Input id="edit-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                    <InputError message={form.errors.name} className="mt-1" />
                </FieldRow>

                <FieldRow label="Description" htmlFor="edit-description">
                    <Textarea
                        id="edit-description"
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                    />
                    <InputError message={form.errors.description} className="mt-1" />
                </FieldRow>

                <FieldRow label="Classification" htmlFor="edit-classification" required>
                    <Select
                        id="edit-classification"
                        value={form.data.base_classification}
                        onChange={(event) => form.setData('base_classification', event.target.value as BaseClassificationValue)}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                    <InputError message={form.errors.base_classification} className="mt-1" />
                </FieldRow>
            </Fieldset>
        </form>
    );
}
