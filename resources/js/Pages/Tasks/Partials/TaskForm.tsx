import Button, { ButtonLink } from '@/components/ui/button';
import Fieldset, { FieldRow } from '@/components/ui/fieldset';
import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import TaskScheduleFields, { inferScheduleMode, type ScheduleMode } from '@/Pages/Tasks/Partials/TaskScheduleFields';
import { store as taskStore, update as taskUpdate } from '@/routes/projects/tasks';
import {
    CLASSIFICATIONS,
    RISK_LEVELS,
    TASK_STATUSES,
    type BaseClassificationValue,
    type Project,
    type RiskLevelValue,
    type Task,
    type TaskStatusValue,
} from '@/types';
import { todayInputDate } from '@/utils/date';
import { resolveWorkCalendar, taskDurationFromDates, taskEndDate, type DurationUnitValue } from '@/utils/schedule';
import { useForm } from '@inertiajs/react';
import { type FormEvent, useMemo, useState } from 'react';

type TaskFormData = {
    name: string;
    description: string;
    parent_id: number | null;
    start_date: string;
    duration_days: number;
    duration_unit: DurationUnitValue;
    is_date_locked: boolean;
    status: TaskStatusValue;
    risk_level: RiskLevelValue;
    percent_complete: number;
    organization: string;
    tags: string;
    base_classification: BaseClassificationValue;
};

type TaskFormProps = {
    project: Project;
    /** When provided, the form edits this task; otherwise it creates a new one. */
    task?: Task;
    /** Candidate parents (create mode only); already capped below the depth limit. */
    parents?: Task[];
    /** Preselected parent when adding a child (create mode only). */
    defaultParentId?: number | null;
    /** Classification options capped at the project baseline. */
    options: typeof CLASSIFICATIONS;
    /** Link target for the cancel button (create page). */
    cancelHref?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
};

export default function TaskForm({
    project,
    task,
    parents = [],
    defaultParentId = null,
    options,
    cancelHref,
    onSuccess,
    onCancel,
}: TaskFormProps) {
    const editing = task !== undefined;

    const form = useForm<TaskFormData>({
        name: task?.name ?? '',
        description: task?.description ?? '',
        parent_id: defaultParentId,
        start_date: task ? (task.start_date ?? '') : todayInputDate(),
        duration_days: task?.duration_days ?? 1,
        duration_unit: task?.duration_unit.value ?? 'work_days',
        is_date_locked: task?.is_date_locked ?? true,
        status: task?.status.value ?? 'not_started',
        risk_level: task?.risk_level.value ?? 'low',
        percent_complete: task?.percent_complete ?? 0,
        organization: task?.organization ?? '',
        tags: (task?.tags ?? []).join(', '),
        base_classification: task?.base_classification.value ?? options[0].value,
    });

    const workCalendar = useMemo(() => resolveWorkCalendar(project), [project]);
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(() => inferScheduleMode(task?.is_date_locked ?? true));
    const [endDate, setEndDate] = useState(() => {
        if (task?.end_date !== null && task?.end_date !== undefined) {
            return task.end_date;
        }

        const start = task?.start_date ?? todayInputDate();
        const duration = task?.duration_days ?? 1;
        const unit = task?.duration_unit.value ?? 'work_days';

        return taskEndDate(start, duration, unit, resolveWorkCalendar(project)) ?? '';
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // Tags are entered as a comma-separated string; send an array, and drop
        // empty entries. start_date / parent_id are normalized to null when blank.
        form.transform((data) => {
            let durationDays = data.duration_days;
            let isDateLocked = data.is_date_locked;

            if (scheduleMode === 'start_end') {
                const derived = taskDurationFromDates(data.start_date, endDate, data.duration_unit, workCalendar);

                if (derived !== null) {
                    durationDays = derived;
                }

                isDateLocked = true;
            } else if (scheduleMode === 'fixed_duration') {
                isDateLocked = false;
            } else {
                isDateLocked = true;
            }

            return {
                ...data,
                duration_days: durationDays,
                is_date_locked: isDateLocked,
                percent_complete: editing ? task.percent_complete : data.percent_complete,
                start_date: data.start_date === '' ? null : data.start_date,
                tags: data.tags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag !== ''),
            };
        });

        if (editing) {
            form.patch(taskUpdate.url([project.id, task.id]), { onSuccess });
        } else {
            form.post(taskStore.url(project.id), { onSuccess });
        }
    };

    return (
        <form onSubmit={submit}>
            <Fieldset
                footer={
                    <>
                        {cancelHref ? (
                            <ButtonLink href={cancelHref} variant="secondary">
                                Cancel
                            </ButtonLink>
                        ) : (
                            onCancel && (
                                <Button variant="secondary" onClick={onCancel} disabled={form.processing}>
                                    Cancel
                                </Button>
                            )
                        )}
                        <Button type="submit" disabled={form.processing}>
                            {editing ? 'Save changes' : 'Create task'}
                        </Button>
                    </>
                }
            >
                <FieldRow label="Name" htmlFor="task-name" required>
                    <Input id="task-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required />
                    <InputError message={form.errors.name} className="mt-1" />
                </FieldRow>

                <FieldRow label="Description" htmlFor="task-description">
                    <Textarea
                        id="task-description"
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                    />
                    <InputError message={form.errors.description} className="mt-1" />
                </FieldRow>

                {!editing && parents.length > 0 && (
                    <FieldRow label="Parent task" htmlFor="task-parent">
                        <Select
                            id="task-parent"
                            value={form.data.parent_id ?? ''}
                            onChange={(event) => form.setData('parent_id', event.target.value === '' ? null : Number(event.target.value))}
                        >
                            <option value="">None (top-level)</option>
                            {parents.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    {'— '.repeat(Math.max(0, candidate.hierarchy_level - 1))}
                                    {candidate.name}
                                </option>
                            ))}
                        </Select>
                        <InputError message={form.errors.parent_id} className="mt-1" />
                    </FieldRow>
                )}

                <TaskScheduleFields
                    mode={scheduleMode}
                    onModeChange={setScheduleMode}
                    startDate={form.data.start_date}
                    onStartDateChange={(value) => form.setData('start_date', value)}
                    endDate={endDate}
                    onEndDateChange={setEndDate}
                    durationDays={form.data.duration_days}
                    onDurationDaysChange={(value) => form.setData('duration_days', value)}
                    durationUnit={form.data.duration_unit}
                    onDurationUnitChange={(value) => form.setData('duration_unit', value)}
                    workCalendar={workCalendar}
                    errors={{
                        start_date: form.errors.start_date,
                        duration_days: form.errors.duration_days,
                        duration_unit: form.errors.duration_unit,
                    }}
                />

                <FieldRow label="Status" htmlFor="task-status" required>
                    <Select id="task-status" value={form.data.status} onChange={(event) => form.setData('status', event.target.value as TaskStatusValue)}>
                        {TASK_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                    <InputError message={form.errors.status} className="mt-1" />
                </FieldRow>

                <FieldRow label="Risk" htmlFor="task-risk" required>
                    <Select id="task-risk" value={form.data.risk_level} onChange={(event) => form.setData('risk_level', event.target.value as RiskLevelValue)}>
                        {RISK_LEVELS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                    <InputError message={form.errors.risk_level} className="mt-1" />
                </FieldRow>

                <FieldRow label="Percent complete" htmlFor={editing ? undefined : 'task-percent'} required={!editing}>
                    {editing ? (
                        <div data-testid="task-percent-readonly">
                            <p className="text-sm text-slate-900 dark:text-white">{task.percent_complete}%</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                Use Update progress in the task header to change this value.
                            </p>
                        </div>
                    ) : (
                        <Input
                            id="task-percent"
                            type="number"
                            min={0}
                            max={100}
                            value={form.data.percent_complete}
                            onChange={(event) => form.setData('percent_complete', Number(event.target.value))}
                            required
                        />
                    )}
                    <InputError message={form.errors.percent_complete} className="mt-1" />
                </FieldRow>

                <FieldRow label="Organization" htmlFor="task-org">
                    <Input id="task-org" value={form.data.organization} onChange={(event) => form.setData('organization', event.target.value)} />
                    <InputError message={form.errors.organization} className="mt-1" />
                </FieldRow>

                <FieldRow label="Tags" htmlFor="task-tags">
                    <Input
                        id="task-tags"
                        placeholder="comma, separated, tags"
                        value={form.data.tags}
                        onChange={(event) => form.setData('tags', event.target.value)}
                    />
                    <InputError message={form.errors.tags} className="mt-1" />
                </FieldRow>

                <FieldRow label="Classification" htmlFor="task-classification" required>
                    <Select
                        id="task-classification"
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
