<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\DurationUnit;
use Carbon\CarbonImmutable;

class Schedule
{
    /**
     * Derive the inclusive end date for a scheduled task.
     */
    public static function endDate(
        CarbonImmutable $start,
        int $durationDays,
        DurationUnit $unit,
        WorkCalendar $calendar,
    ): CarbonImmutable {
        return match ($unit) {
            DurationUnit::CalendarDays => $start->addDays(max(0, $durationDays - 1)),
            DurationUnit::WorkDays => $calendar->endDateForWorkDays($start, $durationDays),
        };
    }

    /**
     * Derive the inclusive start date when duration and end are known
     * (inverse of {@see self::endDate()}).
     */
    public static function startDate(
        CarbonImmutable $end,
        int $durationDays,
        DurationUnit $unit,
        WorkCalendar $calendar,
    ): CarbonImmutable {
        return match ($unit) {
            DurationUnit::CalendarDays => $end->subDays(max(0, $durationDays - 1)),
            DurationUnit::WorkDays => $calendar->startDateForWorkDays($end, $durationDays),
        };
    }

    /**
     * Derive the inclusive duration spanning a start/end pair, or null when
     * the pair cannot form a schedule (end before start, or a work-day span
     * containing no working days). Mirrors taskDurationFromDates() in the
     * frontend scheduler.
     */
    public static function durationBetween(
        CarbonImmutable $start,
        CarbonImmutable $end,
        DurationUnit $unit,
        WorkCalendar $calendar,
    ): ?int {
        if ($end->lessThan($start)) {
            return null;
        }

        if ($unit === DurationUnit::CalendarDays) {
            return (int) $start->diffInDays($end) + 1;
        }

        $count = $calendar->workDaysBetween($start, $end);

        return $count > 0 ? $count : null;
    }

    /**
     * The earliest start date a finish-to-start successor may take after the
     * given predecessor end date, honoring the successor's duration unit.
     */
    public static function nextStartAfter(
        CarbonImmutable $predecessorEnd,
        DurationUnit $unit,
        WorkCalendar $calendar,
    ): CarbonImmutable {
        return match ($unit) {
            DurationUnit::CalendarDays => $predecessorEnd->addDay(),
            DurationUnit::WorkDays => $calendar->nextWorkingDay($predecessorEnd),
        };
    }
}
