<?php

declare(strict_types=1);

use App\Enums\ProjectStatus;

it('exposes a human-readable label for each case', function (): void {
    expect(ProjectStatus::Active->label())->toBe('Active')
        ->and(ProjectStatus::Completed->label())->toBe('Completed');
});

it('reports the active case as active and others as not', function (): void {
    expect(ProjectStatus::Active->isActive())->toBeTrue()
        ->and(ProjectStatus::Completed->isActive())->toBeFalse();
});
