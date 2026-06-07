<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\Role;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('an editor can comment on a task', function () {
    $editor = User::factory()->create();
    $project = Project::factory()->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($editor)->post(route('projects.tasks.comments.store', [$project, $task]), [
        'body' => 'Schedule looks tight.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertRedirect();

    expect($task->comments()->count())->toBe(1)
        ->and($task->comments()->first()->created_by)->toBe($editor->id);
});

test('a viewer cannot comment on a task', function () {
    $viewer = User::factory()->create();
    $project = Project::factory()->withMember($viewer, Role::Viewer)->create();
    $task = Task::factory()->forProject($project)->create();

    $this->actingAs($viewer)->post(route('projects.tasks.comments.store', [$project, $task]), [
        'body' => 'Nope.',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertForbidden();

    expect($task->comments()->count())->toBe(0);
});

test('an admin can moderate (delete) another member task comment', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($admin, Role::Admin)->withMember($editor, Role::Editor)->create();
    $task = Task::factory()->forProject($project)->create();
    $comment = Comment::factory()->forTask($task)->create(['created_by' => $editor->id]);

    $this->actingAs($admin)->delete(route('projects.tasks.comments.destroy', [$project, $task, $comment]))
        ->assertRedirect();

    expect(Comment::withTrashed()->find($comment->id)->trashed())->toBeTrue();
});

test('the task show payload includes comments with abilities', function () {
    $owner = User::factory()->create(['name' => 'Ada Lovelace']);
    $project = Project::factory()->withOwner($owner)->create();
    $task = Task::factory()->forProject($project)->create();
    Comment::factory()->forTask($task)->create(['body' => 'First task note.', 'created_by' => $owner->id]);

    $this->actingAs($owner)->get(route('projects.tasks.show', [$project, $task]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('task.comments', 1)
            ->where('task.comments.0.body', 'First task note.')
            ->where('task.comments.0.author.name', 'Ada Lovelace')
            ->where('task.comments.0.can.update', true)
            ->where('task.comments.0.can.delete', true)
        );
});
