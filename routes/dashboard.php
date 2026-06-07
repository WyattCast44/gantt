<?php

declare(strict_types=1);

use App\Http\Controllers\AcceptInvitationController;
use App\Http\Controllers\DeclineInvitationController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectInvitationController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\RestoreProjectController;
use App\Http\Controllers\SidebarCollapsedController;
use App\Http\Controllers\SidebarWidthController;
use Illuminate\Support\Facades\Route;

/*
|-----------------------------------------------------------------------------
| Dashboard
|-----------------------------------------------------------------------------
*/
Route::inertia('/dashboard', 'Dashboard')
    ->name('dashboard');

/*
|-----------------------------------------------------------------------------
| Projects
|-----------------------------------------------------------------------------
*/
Route::get('/projects', [ProjectController::class, 'index'])
    ->name('projects.index');

Route::get('/projects/create', [ProjectController::class, 'create'])
    ->name('projects.create');

Route::post('/projects', [ProjectController::class, 'store'])
    ->name('projects.store');

Route::patch('/projects/{project}/restore', RestoreProjectController::class)
    ->withTrashed()
    ->name('projects.restore');

/*
|-----------------------------------------------------------------------------
| Project-scoped routes (members only)
|-----------------------------------------------------------------------------
*/
Route::get('/projects/{project}', [ProjectController::class, 'show'])
    ->middleware('project.member')
    ->name('projects.show');

Route::get('/projects/{project}/settings', ProjectSettingsController::class)
    ->middleware('project.member')
    ->name('projects.settings');

Route::patch('/projects/{project}', [ProjectController::class, 'update'])
    ->middleware('project.member')
    ->name('projects.update');

Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])
    ->middleware('project.member')
    ->name('projects.archive');

Route::patch('/projects/{project}/members/{user}', [ProjectMemberController::class, 'update'])
    ->middleware('project.member')
    ->name('projects.members.update');

Route::delete('/projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy'])
    ->middleware('project.member')
    ->name('projects.members.destroy');

Route::post('/projects/{project}/invitations', [ProjectInvitationController::class, 'store'])
    ->middleware('project.member')
    ->name('projects.invitations.store');

Route::delete('/projects/{project}/invitations/{invitation}', [ProjectInvitationController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.invitations.destroy');

/*
|-----------------------------------------------------------------------------
| Invitations
|-----------------------------------------------------------------------------
*/
Route::get('/invitations/{invitation:token}', [InvitationController::class, 'show'])
    ->name('invitations.show');

Route::post('/invitations/{invitation}/accept', AcceptInvitationController::class)
    ->name('invitations.accept');

Route::post('/invitations/{invitation}/decline', DeclineInvitationController::class)
    ->name('invitations.decline');

/*
|-----------------------------------------------------------------------------
| UI preferences: persisted to the session
|-----------------------------------------------------------------------------
*/
Route::put('/sidebar/collapsed', SidebarCollapsedController::class)
    ->name('sidebar.collapsed');

Route::put('/sidebar/width', SidebarWidthController::class)
    ->name('sidebar.width');
