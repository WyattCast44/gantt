<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;

use function Pest\Laravel\actingAs;

test('the documents page renders without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    Document::factory()->forProject($project)->create(['name' => 'Telemetry log']);
    actingAs($owner);

    visit("/projects/{$project->id}/documents")
        ->assertSee('Documents')
        ->assertSee('Telemetry log')
        ->assertSee('Upload')
        ->assertNoJavascriptErrors();
});

test('the empty state renders when a project has no documents', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    actingAs($owner);

    visit("/projects/{$project->id}/documents")
        ->assertSee('No documents uploaded yet')
        ->assertNoJavascriptErrors();
});

test('the document show page renders without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $document = Document::factory()->forProject($project)->create([
        'name' => 'Operations plan',
        'created_by' => $owner->id,
        'updated_by' => $owner->id,
    ]);
    actingAs($owner);

    visit("/projects/{$project->id}/documents/{$document->id}")
        ->assertSee('Operations plan')
        ->assertSee('Preview')
        ->assertSee('Details')
        ->assertSee('Download')
        ->assertNoJavascriptErrors();
});

test('the comments tab renders an empty state without javascript errors', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $document = Document::factory()->forProject($project)->create(['name' => 'Operations plan']);
    actingAs($owner);

    visit("/projects/{$project->id}/documents/{$document->id}?tab=comments")
        ->assertSee('No comments yet')
        ->assertNoJavascriptErrors();
});

test('the comments tab shows an existing comment', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $document = Document::factory()->forProject($project)->create(['name' => 'Operations plan']);
    Comment::factory()->forDocument($document)->create([
        'body' => 'Reviewed and approved.',
        'created_by' => $owner->id,
    ]);
    actingAs($owner);

    visit("/projects/{$project->id}/documents/{$document->id}?tab=comments")
        ->assertSee('Reviewed and approved.')
        ->assertNoJavascriptErrors();
});
