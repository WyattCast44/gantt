<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateTimelinePaneWidthRequest;
use Illuminate\Http\RedirectResponse;

class TimelinePaneWidthController
{
    /**
     * Persist the timeline task-list pane width to the session.
     */
    public function __invoke(UpdateTimelinePaneWidthRequest $request): RedirectResponse
    {
        $request->session()->put('timeline_pane_width', (int) $request->validated('width'));

        return redirect()->back();
    }
}
