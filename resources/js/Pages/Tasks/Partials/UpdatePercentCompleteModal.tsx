import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Modal from '@/components/ui/modal';
import { update as taskUpdate } from '@/routes/projects/tasks';
import { type Project, type Task } from '@/types';
import { useForm } from '@inertiajs/react';
import { type FormEvent, useEffect } from 'react';

function taskUpdatePayload(task: Task, percentComplete: number) {
    return {
        name: task.name,
        description: task.description ?? '',
        start_date: task.start_date,
        duration_days: task.duration_days,
        duration_unit: task.duration_unit.value,
        is_date_locked: task.is_date_locked,
        status: task.status.value,
        risk_level: task.risk_level.value,
        percent_complete: percentComplete,
        organization: task.organization ?? '',
        tags: task.tags ?? [],
        base_classification: task.base_classification.value,
    };
}

type UpdatePercentCompleteModalProps = {
    project: Project;
    task: Task;
    open: boolean;
    onClose: () => void;
};

export default function UpdatePercentCompleteModal({ project, task, open, onClose }: UpdatePercentCompleteModalProps) {
    const form = useForm(taskUpdatePayload(task, task.percent_complete));

    useEffect(() => {
        if (! open) {
            return;
        }

        form.setData(taskUpdatePayload(task, task.percent_complete));
        form.clearErrors();
    }, [open, task]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(taskUpdate.url([project.id, task.id]), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Modal open={open} onClose={onClose} title="Update progress">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="percent-complete" className="text-sm text-slate-700 dark:text-neutral-300">
                        Percent complete
                    </label>
                    <Input
                        id="percent-complete"
                        type="number"
                        min={0}
                        max={100}
                        value={form.data.percent_complete}
                        onChange={(event) => form.setData('percent_complete', Number(event.target.value))}
                        className="mt-1"
                        required
                    />
                    <InputError message={form.errors.percent_complete} className="mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={form.processing}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        Save
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
