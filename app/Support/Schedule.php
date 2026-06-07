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
}
