<?php

arch()
    ->preset()->php();

arch()
    ->preset()->laravel();

arch()
    ->preset()->security();

arch('controllers')
    ->expect('App\Http\Controllers')
    ->toExtendNothing()
    ->toHaveSuffix('Controller')
    ->ignoring('App\Http\Controllers\Concerns');

arch('middleware')
    ->expect('App\Http\Middleware')
    ->toBeClasses();

arch('env is not used outside config')
    ->expect('env')
    ->not->toBeUsed()
    ->ignoring('config');

arch('no debugging functions')
    ->expect(['dd', 'dump', 'ray'])
    ->not->toBeUsed();

arch('view components')
    ->expect('App\View\Components')
    ->toExtend('Illuminate\View\Component')
    ->toHaveMethod('render')
    ->not->toBeUsed();

arch('rules')
    ->expect('App\Rules')
    ->toExtendNothing()
    ->toImplement('Illuminate\Contracts\Validation\ValidationRule')
    ->toOnlyBeUsedIn([
        'App\Http\Controllers',
        'App\Http\Requests',
    ]);
