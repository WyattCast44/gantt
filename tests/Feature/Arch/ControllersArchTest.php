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
    ])
    ->ignoring('App\Http\Controllers\Concerns');
