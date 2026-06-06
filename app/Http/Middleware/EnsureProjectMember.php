<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Project;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProjectMember
{
    /**
     * Block requests for projects the authenticated user is not a member of.
     *
     * Delegates the membership decision to ProjectPolicy@view so role logic
     * lives in a single place.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $project = $request->route('project');
        $user = $request->user();

        if (! $project instanceof Project || $user === null || $user->cannot('view', $project)) {
            abort(Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
