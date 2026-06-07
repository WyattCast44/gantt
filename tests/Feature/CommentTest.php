<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\Role;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('an editor can comment on a document', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($editor)->post(route('projects.documents.comments.store', [$project, $document]), [
        'body' => 'This plan needs a revision.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertRedirect();

    $comment = $document->comments()->firstOrFail();

    expect($comment->body)->toBe('This plan needs a revision.')
        ->and($comment->created_by)->toBe($editor->id)
        ->and($comment->base_classification)->toBe(BaseClassification::UNCLASSIFIED);
});

test('a viewer cannot comment on a document', function () {
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($viewer, Role::Viewer)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($viewer)->post(route('projects.documents.comments.store', [$project, $document]), [
        'body' => 'I should not be able to post this.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertForbidden();

    expect($document->comments()->count())->toBe(0);
});

test('a non-member cannot comment on a document', function () {
    $project = Project::factory()->create();
    $document = Document::factory()->forProject($project)->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->post(route('projects.documents.comments.store', [$project, $document]), [
        'body' => 'Outsider.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertForbidden();

    expect($document->comments()->count())->toBe(0);
});

test('a comment cannot be classified above the project baseline', function () {
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->classifiedAs(BaseClassification::CONFIDENTIAL)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($owner)->post(route('projects.documents.comments.store', [$project, $document]), [
        'body' => 'Classified note.',
        'base_classification' => BaseClassification::SECRET->value,
    ])->assertInvalid('base_classification');

    expect($document->comments()->count())->toBe(0);
});

test('the author can edit their own comment', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();
    $comment = Comment::factory()->forDocument($document)->create(['created_by' => $editor->id]);

    $this->actingAs($editor)->patch(route('projects.documents.comments.update', [$project, $document, $comment]), [
        'body' => 'Edited body.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertRedirect();

    expect($comment->fresh()->body)->toBe('Edited body.');
});

test('a member cannot edit another member comment', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();
    $comment = Comment::factory()->forDocument($document)->create(['created_by' => $owner->id]);

    $this->actingAs($editor)->patch(route('projects.documents.comments.update', [$project, $document, $comment]), [
        'body' => 'Trying to edit someone else.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertForbidden();

    expect($comment->fresh()->body)->toBe($comment->body);
});

test('the author can delete their own comment', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();
    $comment = Comment::factory()->forDocument($document)->create(['created_by' => $editor->id]);

    $this->actingAs($editor)->delete(route('projects.documents.comments.destroy', [$project, $document, $comment]))
        ->assertRedirect();

    expect(Comment::withTrashed()->find($comment->id)->trashed())->toBeTrue();
});

test('an admin can delete another member comment', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($admin, Role::Admin)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();
    $comment = Comment::factory()->forDocument($document)->create(['created_by' => $editor->id]);

    $this->actingAs($admin)->delete(route('projects.documents.comments.destroy', [$project, $document, $comment]))
        ->assertRedirect();

    expect(Comment::withTrashed()->find($comment->id)->trashed())->toBeTrue();
});

test('an editor cannot delete another member comment', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();
    $comment = Comment::factory()->forDocument($document)->create(['created_by' => $owner->id]);

    $this->actingAs($editor)->delete(route('projects.documents.comments.destroy', [$project, $document, $comment]))
        ->assertForbidden();

    expect(Comment::withTrashed()->find($comment->id)->trashed())->toBeFalse();
});

test('the show payload includes comments with per-comment abilities', function () {
    $owner = User::factory()->create(['name' => 'Grace Hopper']);
    $project = Project::factory()->withOwner($owner)->create();
    $document = Document::factory()->forProject($project)->create([
        'created_by' => $owner->id,
        'updated_by' => $owner->id,
    ]);
    Comment::factory()->forDocument($document)->create([
        'body' => 'First!',
        'created_by' => $owner->id,
    ]);

    $this->actingAs($owner)->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Show', false)
            ->has('document.comments', 1)
            ->where('document.comments.0.body', 'First!')
            ->where('document.comments.0.author.name', 'Grace Hopper')
            ->where('document.comments.0.can.update', true)
            ->where('document.comments.0.can.delete', true)
        );
});

test('a viewer sees comments without edit or delete abilities', function () {
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($viewer, Role::Viewer)->create();
    $document = Document::factory()->forProject($project)->create();
    Comment::factory()->forDocument($document)->create(['created_by' => $owner->id]);

    $this->actingAs($viewer)->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('document.comments', 1)
            ->where('document.comments.0.can.update', false)
            ->where('document.comments.0.can.delete', false)
        );
});
