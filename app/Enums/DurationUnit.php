<?php

declare(strict_types=1);

namespace App\Enums;

enum DurationUnit: string
{
    case CalendarDays = 'calendar_days';
    case WorkDays = 'work_days';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::CalendarDays => 'Calendar days',
            self::WorkDays => 'Work days',
        };
    }
}
