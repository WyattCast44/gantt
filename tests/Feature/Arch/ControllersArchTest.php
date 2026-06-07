<?php

arch('controllers only use approved layers')
    ->expect('App\Http\Controllers')
    ->toOnlyUse([
        'App\Http\Requests',
        'App\Http\Controllers',
        'App\Http\Resources',
        'App\Mail',
        'App\Models',
        // Generic domain-event bus (A10): controllers dispatch thin events;
        // listeners (notification delivery, telemetry) subscribe out of band.
        'App\Events',
        // Domain value objects (e.g. action verbs passed to Model::logAction()).
        'App\Enums',
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
