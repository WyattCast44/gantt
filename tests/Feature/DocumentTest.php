<?php

declare(strict_types=1);

use App\Enums\BaseClassification;
use App\Enums\Role;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('the index lists the project documents for a member', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);
    $project = Project::factory()->withOwner($user)->create();
    Document::factory()->forProject($project)->create(['created_by' => $user->id, 'updated_by' => $user->id]);

    $this->actingAs($user)->get(route('projects.documents.index', $project))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Index', false)
            ->has('documents', 1)
            ->where('documents.0.uploaded_by', 'Ada Lovelace')
            ->where('documents.0.updated_at', fn ($value) => is_string($value) && $value !== '')
        );
});

test('an editor can upload a document', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();

    $response = $this->actingAs($editor)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->create('plan.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ]);

    $response->assertRedirect();

    $document = $project->documents()->firstOrFail();

    expect($document->name)->toBe('plan.pdf')
        ->and($document->original_filename)->toBe('plan.pdf')
        ->and($document->disk)->toBe(Document::DISK);

    Storage::disk('documents')->assertExists($document->path);
});

test('an editor can upload multiple documents at once', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();

    $response = $this->actingAs($editor)->post(route('projects.documents.store', $project), [
        'files' => [
            UploadedFile::fake()->create('plan.pdf', 200, 'application/pdf'),
            UploadedFile::fake()->create('photo.png', 100, 'image/png'),
        ],
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
        'description' => 'Batch upload',
    ]);

    $response->assertRedirect();

    expect($project->documents()->count())->toBe(2)
        ->and($project->documents()->pluck('description')->unique()->all())->toBe(['Batch upload']);

    Storage::disk('documents')->assertExists($project->documents()->first()->path);
    Storage::disk('documents')->assertExists($project->documents()->latest('id')->first()->path);
});

test('per-file metadata overrides fall back to shared defaults', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->classifiedAs(BaseClassification::CUI)->create();

    $response = $this->actingAs($owner)->post(route('projects.documents.store', $project), [
        'files' => [
            UploadedFile::fake()->create('plan.pdf', 200, 'application/pdf'),
            UploadedFile::fake()->create('photo.png', 100, 'image/png'),
        ],
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
        'description' => 'Shared notes',
        'file_meta' => [
            ['description' => 'Plan only', 'base_classification' => ''],
            ['description' => '', 'base_classification' => BaseClassification::CUI->value],
        ],
    ]);

    $response->assertRedirect();

    $documents = $project->documents()->orderBy('id')->get();

    expect($documents)->toHaveCount(2)
        ->and($documents[0]->description)->toBe('Plan only')
        ->and($documents[0]->base_classification)->toBe(BaseClassification::UNCLASSIFIED)
        ->and($documents[1]->description)->toBe('Shared notes')
        ->and($documents[1]->base_classification)->toBe(BaseClassification::CUI);
});

test('a viewer cannot upload a document', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($viewer, Role::Viewer)->create();

    $this->actingAs($viewer)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->create('plan.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertForbidden();

    expect($project->documents()->count())->toBe(0);
});

test('a non-member cannot reach the documents index', function () {
    $project = Project::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->get(route('projects.documents.index', $project))
        ->assertForbidden();
});

test('a document cannot be classified above the project baseline', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->classifiedAs(BaseClassification::CONFIDENTIAL)->create();

    $this->actingAs($owner)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->create('secret.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::SECRET->value,
    ])->assertInvalid('base_classification');

    expect($project->documents()->count())->toBe(0);
    Storage::disk('documents')->assertDirectoryEmpty((string) $project->id);
});

test('a member can download a document', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    $this->actingAs($owner)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->create('brief.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ]);

    $document = $project->documents()->firstOrFail();

    $this->actingAs($owner)->get(route('projects.documents.download', [$project, $document]))
        ->assertOk()
        ->assertDownload('brief.pdf');
});

test('a non-member cannot download a document', function () {
    Storage::fake('documents');
    $project = Project::factory()->create();
    $document = Document::factory()->forProject($project)->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->get(route('projects.documents.download', [$project, $document]))
        ->assertForbidden();
});

test('an editor can update document metadata', function () {
    $owner = User::factory()->create();
    $editor = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->withMember($editor, Role::Editor)->create();
    $document = Document::factory()->forProject($project)->create();

    $this->actingAs($editor)->patch(route('projects.documents.update', [$project, $document]), [
        'name' => 'Renamed brief',
        'description' => 'Updated description',
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ])->assertRedirect();

    expect($document->fresh()->name)->toBe('Renamed brief');
});

test('an editor can delete a document and its file', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    $this->actingAs($owner)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->create('temp.pdf', 200, 'application/pdf'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ]);

    $document = $project->documents()->firstOrFail();
    $path = $document->path;

    $this->actingAs($owner)->delete(route('projects.documents.destroy', [$project, $document]))
        ->assertRedirect(route('projects.documents.index', $project));

    expect(Document::withTrashed()->find($document->id)->trashed())->toBeTrue();
    Storage::disk('documents')->assertMissing($path);
});

test('the show page renders the document for a member', function () {
    $user = User::factory()->create();
    $project = Project::factory()->withOwner($user)->create();
    $document = Document::factory()->forProject($project)->create([
        'name' => 'Operations plan',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $this->actingAs($user)->get(route('projects.documents.show', [$project, $document]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Show', false)
            ->where('document.id', $document->id)
            ->where('document.name', 'Operations plan')
            ->where('document.preview_url', fn ($value) => is_string($value) && str_contains($value, '/preview'))
        );
});

test('a non-member cannot reach the document show page', function () {
    $project = Project::factory()->create();
    $document = Document::factory()->forProject($project)->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->get(route('projects.documents.show', [$project, $document]))
        ->assertForbidden();
});

test('a member can preview a document inline', function () {
    Storage::fake('documents');
    $owner = User::factory()->create();
    $project = Project::factory()->withOwner($owner)->create();

    $this->actingAs($owner)->post(route('projects.documents.store', $project), [
        'file' => UploadedFile::fake()->image('chart.png'),
        'base_classification' => BaseClassification::UNCLASSIFIED->value,
    ]);

    $document = $project->documents()->firstOrFail();

    $response = $this->actingAs($owner)->get(route('projects.documents.preview', [$project, $document]));

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('inline')
        ->and($response->headers->get('x-content-type-options'))->toBe('nosniff');
});

test('a non-member cannot preview a document', function () {
    Storage::fake('documents');
    $project = Project::factory()->create();
    $document = Document::factory()->forProject($project)->create();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->get(route('projects.documents.preview', [$project, $document]))
        ->assertForbidden();
});
