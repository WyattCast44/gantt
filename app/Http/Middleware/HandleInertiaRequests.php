<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Resources\ProjectSummaryResource;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * How many projects the workspace switcher shows.
     */
    private const RECENT_PROJECTS_LIMIT = 3;

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'theme' => $user->theme->value,
                ] : null,
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                // The rules-engine dry-run payload: a schedule edit whose
                // cascade would introduce conflicts is flashed back here for
                // the client to confirm (resubmit with confirm: true) or drop.
                'schedulePreview' => fn () => $request->session()->get('schedulePreview'),
            ],
            // Workspace switcher. Lazy closure so partial reloads (e.g. only the
            // sidebar prefs) skip the query.
            'recentProjects' => fn () => $user
                ? ProjectSummaryResource::collection($this->recentProjects($user, $this->currentProjectId($request)))
                : [],
            'sidebarWidth' => fn () => (int) $request->session()->get('sidebar_width', 224),
            'sidebarCollapsed' => fn () => (bool) $request->session()->get('sidebar_collapsed', false),
        ];
    }

    /**
     * The most-recently-updated accessible projects for the switcher, capped at
     * RECENT_PROJECTS_LIMIT and always including the current project.
     *
     * @return Collection<int, Project>
     */
    private function recentProjects(User $user, ?int $currentId): Collection
    {
        $projects = $user->projects()
            ->orderByDesc('projects.updated_at')
            ->limit(self::RECENT_PROJECTS_LIMIT)
            ->get();

        if ($currentId !== null && ! $projects->contains('id', $currentId)) {
            $current = $user->projects()->whereKey($currentId)->first();

            if ($current !== null) {
                $projects = $projects->prepend($current)->take(self::RECENT_PROJECTS_LIMIT);
            }
        }

        return $projects;
    }

    /**
     * Resolve the current project's id from the route, if any.
     */
    private function currentProjectId(Request $request): ?int
    {
        $project = $request->route('project');

        return $project instanceof Project ? $project->id : null;
    }
}
