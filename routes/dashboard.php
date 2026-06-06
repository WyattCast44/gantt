<?php

declare(strict_types=1);

use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::inertia('/dashboard', 'Dashboard')
    ->name('dashboard');

Route::get('/projects/{project}', [ProjectController::class, 'show'])
    ->middleware('project.member')
    ->name('projects.show');
