<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Models\Project;

it('casts base_classification to the BaseClassification enum', function (): void {
    $project = Project::factory()->classifiedAs(BaseClassification::SECRET)->create();

    expect($project->refresh()->base_classification)->toBe(BaseClassification::SECRET);
});

it('defaults to unclassified with special access disabled', function (): void {
    $project = Project::factory()->create();

    expect($project->refresh())
        ->base_classification->toBe(BaseClassification::UNCLASSIFIED)
        ->special_access_required->toBeFalse();
});

it('casts special access fields to bool and array', function (): void {
    $programs = [['name' => 'PID', 'level' => 'secret']];

    $project = Project::factory()
        ->classifiedAs(BaseClassification::TOP_SECRET)
        ->withSpecialAccess($programs)
        ->create(['handling_caveats' => ['SI', 'TK']]);

    expect($project->refresh())
        ->special_access_required->toBeTrue()
        ->handling_caveats->toBe(['SI', 'TK'])
        ->programs->toBe($programs);
});

it('exposes the baseClassification helper from the trait', function (): void {
    $project = Project::factory()->classifiedAs(BaseClassification::CONFIDENTIAL)->create();

    expect($project->baseClassification())->toBe(BaseClassification::CONFIDENTIAL);
});
