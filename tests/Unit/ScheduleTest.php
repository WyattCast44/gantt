<?php

declare(strict_types=1);

use App\Enums\DurationUnit;
use App\Support\Schedule;
use App\Support\WorkCalendar;
use Carbon\CarbonImmutable;

test('end dates are inclusive at day grain for both duration units', function () {
    $calendar = WorkCalendar::default();

    expect(
        Schedule::endDate(CarbonImmutable::parse('2026-03-02'), 5, DurationUnit::CalendarDays, $calendar)->toDateString()
    )->toBe('2026-03-06')
        ->and(
            Schedule::endDate(CarbonImmutable::parse('2026-03-05'), 3, DurationUnit::WorkDays, $calendar)->toDateString()
        )->toBe('2026-03-09');
});

test('start dates invert end dates for both duration units', function () {
    $calendar = WorkCalendar::default();

    expect(
        Schedule::startDate(CarbonImmutable::parse('2026-03-06'), 5, DurationUnit::CalendarDays, $calendar)->toDateString()
    )->toBe('2026-03-02')
        ->and(
            Schedule::startDate(CarbonImmutable::parse('2026-03-09'), 3, DurationUnit::WorkDays, $calendar)->toDateString()
        )->toBe('2026-03-05')
        ->and(
            Schedule::startDate(CarbonImmutable::parse('2026-03-09'), 1, DurationUnit::CalendarDays, $calendar)->toDateString()
        )->toBe('2026-03-09');
});

test('start date and end date round-trip through a duration', function () {
    $calendar = WorkCalendar::default();
    $start = CarbonImmutable::parse('2026-03-03');

    foreach (DurationUnit::cases() as $unit) {
        foreach ([1, 4, 10] as $duration) {
            $end = Schedule::endDate($start, $duration, $unit, $calendar);

            expect(Schedule::startDate($end, $duration, $unit, $calendar)->toDateString())
                ->toBe($start->toDateString());
        }
    }
});

test('duration between derives the inclusive span', function () {
    $calendar = WorkCalendar::default();

    expect(
        Schedule::durationBetween(CarbonImmutable::parse('2026-03-02'), CarbonImmutable::parse('2026-03-06'), DurationUnit::CalendarDays, $calendar)
    )->toBe(5)
        ->and(
            Schedule::durationBetween(CarbonImmutable::parse('2026-03-02'), CarbonImmutable::parse('2026-03-09'), DurationUnit::WorkDays, $calendar)
        )->toBe(6)
        ->and(
            Schedule::durationBetween(CarbonImmutable::parse('2026-03-04'), CarbonImmutable::parse('2026-03-04'), DurationUnit::CalendarDays, $calendar)
        )->toBe(1);
});

test('duration between is null for impossible spans', function () {
    $calendar = WorkCalendar::default();

    expect(
        Schedule::durationBetween(CarbonImmutable::parse('2026-03-06'), CarbonImmutable::parse('2026-03-02'), DurationUnit::CalendarDays, $calendar)
    )->toBeNull()
        ->and(
            Schedule::durationBetween(CarbonImmutable::parse('2026-03-07'), CarbonImmutable::parse('2026-03-08'), DurationUnit::WorkDays, $calendar)
        )->toBeNull();
});

test('a work-day successor of a friday finish starts on monday', function () {
    $calendar = WorkCalendar::default();
    $fridayEnd = CarbonImmutable::parse('2026-03-06');

    expect(Schedule::nextStartAfter($fridayEnd, DurationUnit::WorkDays, $calendar)->toDateString())->toBe('2026-03-09')
        ->and(Schedule::nextStartAfter($fridayEnd, DurationUnit::CalendarDays, $calendar)->toDateString())->toBe('2026-03-07')
        ->and(Schedule::nextStartAfter(CarbonImmutable::parse('2026-03-03'), DurationUnit::WorkDays, $calendar)->toDateString())->toBe('2026-03-04');
});
