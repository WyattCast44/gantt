import Input from '@/components/ui/input';
import InputError from '@/components/ui/input-error';
import Select from '@/components/ui/select';
import { FieldRow } from '@/components/ui/fieldset';
import { DURATION_UNITS, taskDurationFromDates, taskEndDate, taskStartDate, type DurationUnitValue, type ScheduleLocks, type WorkCalendar } from '@/utils/schedule';
import { formatLongDateFromInput } from '@/utils/date';
import { cn } from '@/utils/cn';
import { focusRingNeutral } from '@/utils/focusRing';
import { useMemo } from 'react';

export type ScheduleMode = 'start_duration' | 'start_end' | 'fixed_duration';

/** Pick the schedule editor mode that best matches a task's stored locks. */
export function inferScheduleMode(locks: ScheduleLocks): ScheduleMode {
    if (locks.lock_start && locks.lock_end) {
        return 'start_end';
    }

    if (locks.lock_start || (locks.lock_end && locks.lock_duration)) {
        return 'start_duration';
    }

    return 'fixed_duration';
}

/** The lock flags each schedule editor mode commits (max two of three). */
export function locksForScheduleMode(mode: ScheduleMode): ScheduleLocks {
    switch (mode) {
        case 'start_duration':
            return { lock_start: true, lock_end: false, lock_duration: true };
        case 'start_end':
            return { lock_start: true, lock_end: true, lock_duration: false };
        case 'fixed_duration':
            return { lock_start: false, lock_end: false, lock_duration: true };
    }
}

const SCHEDULE_MODES: { value: ScheduleMode; label: string; description: string }[] = [
    {
        value: 'start_duration',
        label: 'Start + duration',
        description: 'Pick a start date and duration; the end date is calculated for you.',
    },
    {
        value: 'start_end',
        label: 'Start + end',
        description: 'Pick start and end dates; duration is calculated from the span.',
    },
    {
        value: 'fixed_duration',
        label: 'Fixed duration',
        description: 'Lock the duration and adjust either the start or end date freely.',
    },
];

type TaskScheduleFieldsProps = {
    mode: ScheduleMode;
    onModeChange: (mode: ScheduleMode) => void;
    startDate: string;
    onStartDateChange: (value: string) => void;
    endDate: string;
    onEndDateChange: (value: string) => void;
    durationDays: number;
    onDurationDaysChange: (value: number) => void;
    durationUnit: DurationUnitValue;
    onDurationUnitChange: (value: DurationUnitValue) => void;
    workCalendar: WorkCalendar;
    errors: {
        start_date?: string;
        duration_days?: string;
        duration_unit?: string;
    };
};

export default function TaskScheduleFields({
    mode,
    onModeChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    durationDays,
    onDurationDaysChange,
    durationUnit,
    onDurationUnitChange,
    workCalendar,
    errors,
}: TaskScheduleFieldsProps) {
    const calculatedEndDate = useMemo(
        () => taskEndDate(startDate, durationDays, durationUnit, workCalendar),
        [startDate, durationDays, durationUnit, workCalendar],
    );

    const calculatedDuration = useMemo(
        () => taskDurationFromDates(startDate, endDate, durationUnit, workCalendar),
        [startDate, endDate, durationUnit, workCalendar],
    );

    const formattedCalculatedEndDate = useMemo(
        () => (calculatedEndDate ? formatLongDateFromInput(calculatedEndDate) : null),
        [calculatedEndDate],
    );

    const handleStartChange = (value: string): void => {
        onStartDateChange(value);

        if (mode === 'fixed_duration') {
            const nextEnd = taskEndDate(value, durationDays, durationUnit, workCalendar);

            if (nextEnd !== null) {
                onEndDateChange(nextEnd);
            }
        }
    };

    const handleEndChange = (value: string): void => {
        onEndDateChange(value);

        if (mode === 'fixed_duration') {
            const nextStart = taskStartDate(value, durationDays, durationUnit, workCalendar);

            if (nextStart !== null) {
                onStartDateChange(nextStart);
            }
        }
    };

    const handleDurationChange = (value: number): void => {
        onDurationDaysChange(value);

        if (mode === 'fixed_duration') {
            const nextEnd = taskEndDate(startDate, value, durationUnit, workCalendar);

            if (nextEnd !== null) {
                onEndDateChange(nextEnd);
            }
        }
    };

    const handleDurationUnitChange = (value: DurationUnitValue): void => {
        onDurationUnitChange(value);

        if (mode === 'start_duration') {
            return;
        }

        if (mode === 'start_end' && calculatedDuration !== null) {
            onDurationDaysChange(calculatedDuration);

            return;
        }

        const nextEnd = taskEndDate(startDate, durationDays, value, workCalendar);

        if (nextEnd !== null) {
            onEndDateChange(nextEnd);
        }
    };

    const handleModeChange = (nextMode: ScheduleMode): void => {
        onModeChange(nextMode);

        if (nextMode === 'start_end' && calculatedEndDate !== null) {
            onEndDateChange(calculatedEndDate);
        }

        if (nextMode === 'fixed_duration' && calculatedEndDate !== null) {
            onEndDateChange(calculatedEndDate);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
                <div className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-neutral-300">Schedule by</div>
                <div className="px-4 py-3">
                    <div
                        role="radiogroup"
                        aria-label="Schedule by"
                        data-testid="schedule-mode"
                        className="inline-flex w-full max-w-xl overflow-hidden rounded-md border border-border dark:border-border-dark"
                    >
                        {SCHEDULE_MODES.map((option, index) => {
                            const active = option.value === mode;

                            return (
                                <label
                                    key={option.value}
                                    title={option.description}
                                    className={cn(
                                        'flex flex-1 cursor-pointer items-center justify-center px-2 py-2 text-center text-xs font-medium transition',
                                        index < SCHEDULE_MODES.length - 1 && 'border-r border-border dark:border-border-dark',
                                        focusRingNeutral,
                                        active
                                            ? 'bg-accent-600 text-white dark:bg-accent-500'
                                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="schedule-mode"
                                        value={option.value}
                                        checked={active}
                                        onChange={() => handleModeChange(option.value)}
                                        className="sr-only"
                                    />
                                    {option.label}
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>

            <FieldRow label="Start date" htmlFor="task-start">
                <Input id="task-start" type="date" value={startDate} onChange={(event) => handleStartChange(event.target.value)} />
                <InputError message={errors.start_date} className="mt-1" />
            </FieldRow>

            {mode === 'start_duration' && (
                <>
                    <FieldRow label="Duration" htmlFor="task-duration" required>
                        <DurationInput
                            id="task-duration"
                            durationDays={durationDays}
                            durationUnit={durationUnit}
                            onDurationDaysChange={handleDurationChange}
                            onDurationUnitChange={handleDurationUnitChange}
                            disabled={false}
                        />
                        <InputError message={errors.duration_days ?? errors.duration_unit} className="mt-1" />
                    </FieldRow>

                    <FieldRow label="End date" htmlFor="task-end">
                        <Input
                            id="task-end"
                            type="text"
                            disabled
                            readOnly
                            value={formattedCalculatedEndDate ?? ''}
                            placeholder="—"
                            className="cursor-not-allowed opacity-60"
                            aria-describedby={formattedCalculatedEndDate ? undefined : 'task-end-help'}
                        />
                        {!formattedCalculatedEndDate && (
                            <p id="task-end-help" className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                                Set a start date to calculate the end date.
                            </p>
                        )}
                    </FieldRow>
                </>
            )}

            {mode === 'start_end' && (
                <>
                    <FieldRow label="End date" htmlFor="task-end-input" required>
                        <Input id="task-end-input" type="date" value={endDate} onChange={(event) => handleEndChange(event.target.value)} />
                    </FieldRow>

                    <FieldRow label="Duration" htmlFor="task-duration-calculated">
                        <DurationInput
                            id="task-duration-calculated"
                            durationDays={calculatedDuration ?? durationDays}
                            durationUnit={durationUnit}
                            onDurationDaysChange={() => undefined}
                            onDurationUnitChange={handleDurationUnitChange}
                            durationDaysDisabled
                        />
                        <InputError message={errors.duration_days ?? errors.duration_unit} className="mt-1" />
                    </FieldRow>
                </>
            )}

            {mode === 'fixed_duration' && (
                <>
                    <FieldRow label="Duration" htmlFor="task-duration" required>
                        <DurationInput
                            id="task-duration"
                            durationDays={durationDays}
                            durationUnit={durationUnit}
                            onDurationDaysChange={handleDurationChange}
                            onDurationUnitChange={handleDurationUnitChange}
                            disabled={false}
                        />
                        <InputError message={errors.duration_days ?? errors.duration_unit} className="mt-1" />
                    </FieldRow>

                    <FieldRow label="End date" htmlFor="task-end-input" required>
                        <Input id="task-end-input" type="date" value={endDate} onChange={(event) => handleEndChange(event.target.value)} />
                    </FieldRow>
                </>
            )}
        </>
    );
}

function DurationInput({
    id,
    durationDays,
    durationUnit,
    onDurationDaysChange,
    onDurationUnitChange,
    disabled = false,
    durationDaysDisabled = false,
}: {
    id: string;
    durationDays: number;
    durationUnit: DurationUnitValue;
    onDurationDaysChange: (value: number) => void;
    onDurationUnitChange: (value: DurationUnitValue) => void;
    disabled?: boolean;
    durationDaysDisabled?: boolean;
}) {
    return (
        <div className="grid grid-cols-[minmax(5rem,1fr)_auto]">
            <Input
                id={id}
                type="number"
                min={1}
                value={durationDays}
                onChange={(event) => onDurationDaysChange(Number(event.target.value))}
                required={!durationDaysDisabled}
                disabled={disabled || durationDaysDisabled}
                readOnly={durationDaysDisabled}
                className={cn('rounded-r-none border-r-0', durationDaysDisabled && 'cursor-not-allowed opacity-60')}
            />
            <Select
                id={`${id}-unit`}
                value={durationUnit}
                onChange={(event) => onDurationUnitChange(event.target.value as DurationUnitValue)}
                aria-label="Duration unit"
                disabled={disabled}
                className="w-[9.75rem] rounded-l-none"
            >
                {DURATION_UNITS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
        </div>
    );
}
