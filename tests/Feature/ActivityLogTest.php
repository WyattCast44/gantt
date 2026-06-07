<?php

declare(strict_types=1);

use App\Enums\ActivityAction;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('creating a model records an activity with the new values and causer', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    $project = Project::factory()->withOwner($user)->create(['name' => 'Atlas']);

    $activity = $project->activitiesAsSubject()->where('event', 'created')->sole();

    expect($activity->causer)->not->toBeNull()
        ->and($activity->causer->id)->toBe($user->id)
        ->and($activity->attribute_changes['attributes']['name'])->toBe('Atlas');
});

test('updating a model records the previous and new values', function () {
    $user = User::factory()->create();
    $document = Document::factory()->forProject(Project::factory()->withOwner($user)->create())->create([
        'name' => 'Draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user);
    $document->update(['name' => 'Final']);

    $activity = $document->activitiesAsSubject()->where('event', 'updated')->sole();

    expect($activity->attribute_changes['old']['name'])->toBe('Draft')
        ->and($activity->attribute_changes['attributes']['name'])->toBe('Final');
});

test('an update with no real changes records no activity', function () {
    $user = User::factory()->create();
    $document = Document::factory()->forProject(Project::factory()->withOwner($user)->create())->create([
        'name' => 'Draft',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user);
    $document->update(['name' => 'Draft']);

    expect($document->activitiesAsSubject()->where('event', 'updated')->count())->toBe(0);
});

test('deleting a model records a deleted activity', function () {
    $user = User::factory()->create();
    $document = Document::factory()->forProject(Project::factory()->withOwner($user)->create())->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user);
    $document->delete();

    $activity = Activity::query()
        ->where('subject_type', Relation::getMorphAlias(Document::class))
        ->where('subject_id', $document->id)
        ->where('event', 'deleted')
        ->sole();

    expect($activity)->not->toBeNull();
});

test('the user password is never written to the activity log', function () {
    $user = User::factory()->create(['name' => 'Grace']);

    $this->actingAs($user);
    // Change a logged field alongside the excluded password so an activity is
    // recorded; the password must not appear in either side of the diff.
    $user->update(['name' => 'Grace Hopper', 'password' => 'a-brand-new-secret']);

    $activity = $user->activitiesAsSubject()->where('event', 'updated')->sole();

    expect($activity->attribute_changes['attributes'])->toHaveKey('name')
        ->and($activity->attribute_changes->get('attributes', []))->not->toHaveKey('password')
        ->and($activity->attribute_changes->get('old', []))->not->toHaveKey('password');
});

test('activity log entries cannot be updated', function () {
    $project = Project::factory()->create();
    $activity = $project->activitiesAsSubject()->sole();

    expect(fn () => $activity->update(['description' => 'tampered']))
        ->toThrow(RuntimeException::class);
});

test('activity log entries cannot be deleted', function () {
    $project = Project::factory()->create();
    $activity = $project->activitiesAsSubject()->sole();

    expect(fn () => $activity->delete())
        ->toThrow(RuntimeException::class);
});

test('downloading a document records a downloaded action against the document', function () {
    Storage::fake('documents');
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $document = Document::factory()->forProject($project)->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    Storage::disk('documents')->put($document->path, 'file contents');

    $this->actingAs($user)
        ->get(route('projects.documents.download', [$project, $document]))
        ->assertOk();

    $activity = $document->activitiesAsSubject()->where('event', 'downloaded')->sole();

    expect($activity->causer?->id)->toBe($user->id)
        ->and($activity->subject_id)->toBe($document->id)
        ->and($activity->subject_type)->toBe(Relation::getMorphAlias(Document::class))
        // No request metadata is captured yet, so properties stays null.
        ->and($activity->properties->all())->toBe([]);
});

test('a downloaded action surfaces in the document activity trail', function () {
    Storage::fake('documents');
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $document = Document::factory()->forProject($project)->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);
    Storage::disk('documents')->put($document->path, 'file contents');

    $this->actingAs($user)->get(route('projects.documents.download', [$project, $document]));

    $this->actingAs($user)->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Show', false)
            ->where('document.activities', fn ($activities) => collect($activities)
                ->contains(fn ($activity) => $activity['event'] === 'downloaded'))
        );
});

test('the document show page exposes the activity trail', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $document = Document::factory()->forProject($project)->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user)->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Show', false)
            ->has('document.activities')
            ->where('document.activities.0.event', 'created')
        );
});

test('the activity trail read is capped to a recent window', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $document = Document::factory()->forProject($project)->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user);

    // Generate far more entries than the cap; the read must stay bounded rather
    // than serialising the whole (never-pruned) trail. One probe row past the
    // cap is returned so the frontend can flag that older entries exist.
    foreach (range(1, ActivityResource::RECENT_LIMIT + 5) as $ignored) {
        $document->logAction(ActivityAction::Downloaded);
    }

    $this->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Show', false)
            ->has('document.activities', ActivityResource::RECENT_LIMIT + 1)
        );
});
