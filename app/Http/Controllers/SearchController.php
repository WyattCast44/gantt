<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Global search across the projects, tasks, and documents the authenticated
 * user can access. Results are scoped to the user's project memberships and,
 * when a current project is supplied, that project's hits are surfaced first
 * within each group. Returns JSON for the topbar's type-ahead palette.
 */
class SearchController
{
    /**
     * The maximum number of hits returned per result group.
     */
    private const PER_GROUP = 8;

    /**
     * The minimum query length before a search runs.
     */
    private const MIN_QUERY_LENGTH = 2;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'project' => ['nullable', 'integer'],
        ]);

        $query = trim((string) ($validated['q'] ?? ''));

        if (mb_strlen($query) < self::MIN_QUERY_LENGTH) {
            return response()->json(['query' => $query, 'groups' => []]);
        }

        $accessibleProjectIds = $request->user()->projects()->pluck('projects.id');

        if ($accessibleProjectIds->isEmpty()) {
            return response()->json(['query' => $query, 'groups' => []]);
        }

        $currentProjectId = isset($validated['project']) ? (int) $validated['project'] : null;
        if ($currentProjectId !== null && ! $accessibleProjectIds->contains($currentProjectId)) {
            $currentProjectId = null;
        }

        /** @var Collection<int, Project> $projects */
        $projects = Project::search($query)
            ->whereIn('id', $accessibleProjectIds->all())
            ->take(self::PER_GROUP)
            ->get();

        /** @var Collection<int, Task> $tasks */
        $tasks = Task::search($query)
            ->whereIn('project_id', $accessibleProjectIds->all())
            ->take(self::PER_GROUP)
            ->get()
            ->load('project');

        /** @var Collection<int, Document> $documents */
        $documents = Document::search($query)
            ->whereIn('project_id', $accessibleProjectIds->all())
            ->take(self::PER_GROUP)
            ->get()
            ->load('project');

        $groups = collect([
            $this->group('projects', 'Projects', $projects, $currentProjectId, fn (Project $project): array => [
                'type' => 'project',
                'id' => $project->id,
                'title' => $project->name,
                'subtitle' => null,
                'projectId' => $project->id,
                'projectName' => $project->name,
                'url' => route('projects.show', $project->id),
                'classification' => $project->base_classification->label(),
            ]),
            $this->group('tasks', 'Tasks', $tasks, $currentProjectId, fn (Task $task): array => [
                'type' => 'task',
                'id' => $task->id,
                'title' => $task->name,
                'subtitle' => $task->project?->name,
                'projectId' => $task->project_id,
                'projectName' => $task->project?->name,
                'url' => route('projects.tasks.show', [$task->project_id, $task->id]),
                'classification' => $task->base_classification->label(),
            ]),
            $this->group('documents', 'Documents', $documents, $currentProjectId, fn (Document $document): array => [
                'type' => 'document',
                'id' => $document->id,
                'title' => $document->name,
                'subtitle' => $document->project?->name,
                'projectId' => $document->project_id,
                'projectName' => $document->project?->name,
                'url' => route('projects.documents.show', [$document->project_id, $document->id]),
                'classification' => $document->base_classification->label(),
            ]),
        ])->filter(fn (array $group): bool => $group['items'] !== [])->values();

        return response()->json([
            'query' => $query,
            'groups' => $groups,
        ]);
    }

    /**
     * Build a result group, surfacing current-project hits first (stable sort).
     *
     * @param  Collection<int, Project|Task|Document>  $models
     * @param  callable(Project|Task|Document): array<string, mixed>  $map
     * @return array{type: string, label: string, items: list<array<string, mixed>>}
     */
    private function group(string $type, string $label, Collection $models, ?int $currentProjectId, callable $map): array
    {
        $items = $models
            ->sortByDesc(fn (Project|Task|Document $model): bool => $currentProjectId !== null
                && $this->projectIdFor($model) === $currentProjectId)
            ->map($map)
            ->values()
            ->all();

        return ['type' => $type, 'label' => $label, 'items' => $items];
    }

    /**
     * Resolve the owning project id for a searchable model (a project owns itself).
     */
    private function projectIdFor(Project|Task|Document $model): int
    {
        return $model instanceof Project ? $model->id : $model->project_id;
    }
}
