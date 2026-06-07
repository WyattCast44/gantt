<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Project working-time calendar. Weekday exclusions are JavaScript-compatible
 * (0 = Sunday … 6 = Saturday) so the API matches the frontend scheduler.
 *
 * Future project settings will hydrate this from the database; until then
 * {@see self::default()} supplies Saturday and Sunday as non-working days.
 */
class WorkCalendar
{
    /**
     * @param  array<int>  $nonWorkingWeekdays
     */
    public function __construct(public readonly array $nonWorkingWeekdays) {}

    /**
     * The MVP default: Saturday and Sunday off.
     */
    public static function default(): self
    {
        return new self([0, 6]);
    }

    /**
     * @return array{non_working_weekdays: array<int>}
     */
    public function toArray(): array
    {
        return [
            'non_working_weekdays' => $this->nonWorkingWeekdays,
        ];
    }

    public function isWorkingDay(CarbonImmutable $date): bool
    {
        return ! in_array($date->dayOfWeek, $this->nonWorkingWeekdays, true);
    }

    /**
     * Inclusive work-day span: a one-day task ends on its first working day on
     * or after the start date.
     */
    public function endDateForWorkDays(CarbonImmutable $start, int $durationDays): CarbonImmutable
    {
        $current = $start;
        $counted = 0;

        while ($counted < $durationDays) {
            if ($this->isWorkingDay($current)) {
                $counted++;

                if ($counted === $durationDays) {
                    return $current;
                }
            }

            $current = $current->addDay();
        }

        return $current;
    }
}
