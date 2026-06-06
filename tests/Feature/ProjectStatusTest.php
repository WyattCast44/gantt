<?php

declare(strict_types=1);

use App\Enums\ProjectStatus;
use App\Models\Project;

it('casts status to the ProjectStatus enum', function (): void {
    $project = Project::factory()->create();

    expect($project->refresh()->status)->toBe(ProjectStatus::Active);
});

it('defaults new projects to active', function (): void {
    $project = Project::factory()->create();

    expect($project->status)->toBe(ProjectStatus::Active);
});

it('marks a project completed via the factory state', function (): void {
    $project = Project::factory()->completed()->create();

    expect($project->refresh()->status)->toBe(ProjectStatus::Completed);
});
