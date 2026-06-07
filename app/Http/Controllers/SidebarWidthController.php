<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateSidebarWidthRequest;
use Illuminate\Http\RedirectResponse;

class SidebarWidthController
{
    /**
     * Persist the sidebar width to the session.
     */
    public function __invoke(UpdateSidebarWidthRequest $request): RedirectResponse
    {
        $request->session()->put('sidebar_width', (int) $request->validated('width'));

        return redirect()->back();
    }
}
