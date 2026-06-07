<?php

arch('controllers only use approved layers')
    ->expect('App\Http\Controllers')
    ->toOnlyUse([
        'App\Http\Requests',
        'App\Http\Controllers',
        'App\Http\Resources',
        'App\Mail',
        'App\Models',
        'Illuminate\Http',
        'Illuminate\Support\Facades\DB',
        'Illuminate\Support\Facades\Mail',
        'Illuminate\Foundation\Auth\Access\AuthorizesRequests',
        'Inertia',
        'redirect',
        // Streamed/file-download responses (e.g. document downloads) are typed
        // against Symfony's HTTP foundation; the file I/O itself lives on models.
        'Symfony\Component\HttpFoundation',
    ])
    ->ignoring('App\Http\Controllers\Concerns');
