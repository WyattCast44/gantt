<?php

arch('controllers only use approved layers')
    ->expect('App\Http\Controllers')
    ->toOnlyUse([
        'App\Http\Requests',
        'App\Http\Controllers',
        'App\Services',
        'App\Models',
        'Illuminate\Http',
        'Illuminate\Foundation\Auth\Access\AuthorizesRequests',
        'Inertia',
    ])
    ->ignoring('App\Http\Controllers\Concerns');

arch('controllers do not run raw queries')
    ->expect('App\Http\Controllers')
    ->not->toUse([
        'Illuminate\Support\Facades\DB',
        'DB',
    ]);
