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

test('the next working day after a friday is monday', function () {
    $calendar = WorkCalendar::default();

    expect($calendar->nextWorkingDay(CarbonImmutable::parse('2026-03-06'))->toDateString())->toBe('2026-03-09')
        ->and($calendar->nextWorkingDay(CarbonImmutable::parse('2026-03-02'))->toDateString())->toBe('2026-03-03')
        ->and($calendar->nextWorkingDay(CarbonImmutable::parse('2026-03-07'))->toDateString())->toBe('2026-03-09');
});

test('work-day start dates walk backward over weekends', function () {
    $calendar = WorkCalendar::default();

    expect(
        $calendar->startDateForWorkDays(CarbonImmutable::parse('2026-03-06'), 5)->toDateString()
    )->toBe('2026-03-02')
        ->and(
            $calendar->startDateForWorkDays(CarbonImmutable::parse('2026-03-09'), 2)->toDateString()
        )->toBe('2026-03-06')
        ->and(
            $calendar->startDateForWorkDays(CarbonImmutable::parse('2026-03-08'), 1)->toDateString()
        )->toBe('2026-03-06');
});

test('work days between counts the inclusive working-day span', function () {
    $calendar = WorkCalendar::default();

    expect($calendar->workDaysBetween(CarbonImmutable::parse('2026-03-02'), CarbonImmutable::parse('2026-03-06')))->toBe(5)
        ->and($calendar->workDaysBetween(CarbonImmutable::parse('2026-03-06'), CarbonImmutable::parse('2026-03-09')))->toBe(2)
        ->and($calendar->workDaysBetween(CarbonImmutable::parse('2026-03-07'), CarbonImmutable::parse('2026-03-08')))->toBe(0)
        ->and($calendar->workDaysBetween(CarbonImmutable::parse('2026-03-09'), CarbonImmutable::parse('2026-03-06')))->toBe(0);
});
