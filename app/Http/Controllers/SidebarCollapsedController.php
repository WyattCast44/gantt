<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSidebarCollapsedRequest;
use Illuminate\Http\RedirectResponse;

class SidebarCollapsedController
{
    /**
     * Persist the sidebar collapsed state to the session.
     */
    public function __invoke(UpdateSidebarCollapsedRequest $request): RedirectResponse
    {
        $request->session()->put('sidebar_collapsed', $request->boolean('collapsed'));

        return redirect()->back();
    }
}
