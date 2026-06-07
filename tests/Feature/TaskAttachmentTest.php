<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\Role;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('an editor can attach an existing project document to a task', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($editor)->post(route('projects.tasks.documents.store', [$project, $task]), [
        'document_id' => $document->id,
    ])->assertRedirect();

    expect($task->documents()->whereKey($document->id)->exists())->toBeTrue();
});

test('a viewer cannot attach a document', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($viewer)->post(route('projects.tasks.documents.store', [$project, $task]), [
        'document_id' => $document->id,
    ])->assertForbidden();

    expect($task->documents()->count())->toBe(0);
});

test('a duplicate attachment is rejected', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create();
    $task->documents()->attach($document->id);

    $this->actingAs($owner)->post(route('projects.tasks.documents.store', [$project, $task]), [
        'document_id' => $document->id,
    ])->assertInvalid('document_id');

    expect($task->documents()->count())->toBe(1);
});

test('a document from another project cannot be attached', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $other = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $foreign = Document::factory()->forProject($other)->create();

    $this->actingAs($owner)->post(route('projects.tasks.documents.store', [$project, $task]), [
        'document_id' => $foreign->id,
    ])->assertInvalid('document_id');

    expect($task->documents()->count())->toBe(0);
});

test('an editor can detach a document without deleting it', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create();
    $task->documents()->attach($document->id);

    $this->actingAs($editor)->delete(route('projects.tasks.documents.destroy', [$project, $task, $document]))
        ->assertRedirect();

    expect($task->documents()->count())->toBe(0)
        ->and(Document::find($document->id))->not->toBeNull();
});

test('uploading from a task creates the document and attaches it', function () {
    Storage::fake('documents');

    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($owner)->post(route('projects.tasks.documents.upload', [$project, $task]), [
        'file' => UploadedFile::fake()->create('plan.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertRedirect();

    expect($project->documents()->count())->toBe(1)
        ->and($task->documents()->count())->toBe(1)
        ->and($task->documents()->first()->original_filename)->toBe('plan.pdf');
});

test('attaching a document logs an activity action on the task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create(['name' => 'Range plan']);

    $this->actingAs($owner)->post(route('projects.tasks.documents.store', [$project, $task]), [
        'document_id' => $document->id,
    ])->assertRedirect();

    $activity = $task->activitiesAsSubject()->where('event', 'attached')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->causer_id)->toBe($owner->id)
        ->and($activity->properties['document'] ?? null)->toBe('Range plan');
});

test('detaching a document logs an activity action on the task', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $document = Document::factory()->forProject($project)->create(['name' => 'Range plan']);
    $task->documents()->attach($document->id);

    $this->actingAs($owner)->delete(route('projects.tasks.documents.destroy', [$project, $task, $document]))
        ->assertRedirect();

    $activity = $task->activitiesAsSubject()->where('event', 'detached')->first();

    expect($activity)->not->toBeNull()
        ->and($activity->properties['document'] ?? null)->toBe('Range plan');
});

test('the task show payload includes attached documents and candidates', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    $attached = Document::factory()->forProject($project)->create(['name' => 'Attached plan']);
    Document::factory()->forProject($project)->create(['name' => 'Unattached spec']);
    $task->documents()->attach($attached->id);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('task.documents', 1)
            ->where('task.documents.0.name', 'Attached plan')
            ->has('projectDocuments', 2)
        );
});
