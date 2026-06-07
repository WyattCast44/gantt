<?php

declare(strict_types=1);

use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;

test('the default calendar treats saturday and sunday as non-working', function () {
    $calendar = WorkCalendar::default();

    expect($calendar->isWorkingDay(CarbonImmutable::parse('2026-03-02')))->toBeTrue()
        ->and($calendar->isWorkingDay(CarbonImmutable::parse('2026-03-01')))->toBeFalse()
        ->and($calendar->isWorkingDay(CarbonImmutable::parse('2026-03-07')))->toBeFalse();
});

test('work-day end dates skip weekends', function () {
    $calendar = WorkCalendar::default();

    expect(
        $calendar->endDateForWorkDays(CarbonImmutable::parse('2026-03-01'), 1)->toDateString()
    )->toBe('2026-03-02')
        ->and(
            $calendar->endDateForWorkDays(CarbonImmutable::parse('2026-03-02'), 5)->toDateString()
        )->toBe('2026-03-06');
});
