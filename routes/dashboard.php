<?php

declare(strict_types=1);

use App\Http\Controllers\AcceptInvitationController;
use App\Http\Controllers\DeclineInvitationController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DownloadDocumentController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\PreviewDocumentController;
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

Route::get('/projects/{project}/documents', [DocumentController::class, 'index'])
    ->middleware('project.member')
    ->name('projects.documents.index');

Route::post('/projects/{project}/documents', [DocumentController::class, 'store'])
    ->middleware('project.member')
    ->name('projects.documents.store');

Route::get('/projects/{project}/documents/{document}', [DocumentController::class, 'show'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.show');

Route::patch('/projects/{project}/documents/{document}', [DocumentController::class, 'update'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.update');

Route::delete('/projects/{project}/documents/{document}', [DocumentController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.destroy');

Route::get('/projects/{project}/documents/{document}/download', DownloadDocumentController::class)
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.download');

Route::get('/projects/{project}/documents/{document}/preview', PreviewDocumentController::class)
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.preview');

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
