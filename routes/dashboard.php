<?php

declare(strict_types=1);

use App\Http\Controllers\AcceptInvitationController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CompleteTaskController;
use App\Http\Controllers\DeclineInvitationController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DownloadDocumentController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\PreviewDocumentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectInvitationController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\ReorderTasksController;
use App\Http\Controllers\RescheduleTaskController;
use App\Http\Controllers\RestoreProjectController;
use App\Http\Controllers\SidebarCollapsedController;
use App\Http\Controllers\SidebarWidthController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskDependencyController;
use App\Http\Controllers\TaskDocumentController;
use App\Http\Controllers\TimelineController;
use App\Http\Controllers\UploadTaskDocumentController;
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

Route::post('/projects/{project}/documents/{document}/comments', [CommentController::class, 'store'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.comments.store');

Route::patch('/projects/{project}/documents/{document}/comments/{comment}', [CommentController::class, 'update'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.comments.update');

Route::delete('/projects/{project}/documents/{document}/comments/{comment}', [CommentController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.documents.comments.destroy');

Route::get('/projects/{project}/timeline', TimelineController::class)
    ->middleware('project.member')
    ->name('projects.timeline');

Route::get('/projects/{project}/tasks', [TaskController::class, 'index'])
    ->middleware('project.member')
    ->name('projects.tasks.index');

Route::get('/projects/{project}/tasks/create', [TaskController::class, 'create'])
    ->middleware('project.member')
    ->name('projects.tasks.create');

Route::post('/projects/{project}/tasks', [TaskController::class, 'store'])
    ->middleware('project.member')
    ->name('projects.tasks.store');

// Declared before the /tasks/{task} routes so "reorder" is not captured as {task}.
Route::patch('/projects/{project}/tasks/reorder', ReorderTasksController::class)
    ->middleware('project.member')
    ->name('projects.tasks.reorder');

Route::get('/projects/{project}/tasks/{task}', [TaskController::class, 'show'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.show');

Route::patch('/projects/{project}/tasks/{task}', [TaskController::class, 'update'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.update');

Route::patch('/projects/{project}/tasks/{task}/reschedule', RescheduleTaskController::class)
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.reschedule');

Route::post('/projects/{project}/tasks/{task}/complete', CompleteTaskController::class)
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.complete');

Route::delete('/projects/{project}/tasks/{task}', [TaskController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.destroy');

Route::post('/projects/{project}/tasks/{task}/comments', [TaskCommentController::class, 'store'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.comments.store');

Route::patch('/projects/{project}/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'update'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.comments.update');

Route::delete('/projects/{project}/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.comments.destroy');

Route::post('/projects/{project}/tasks/{task}/dependencies', [TaskDependencyController::class, 'store'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.dependencies.store');

Route::delete('/projects/{project}/tasks/{task}/dependencies/{predecessor}', [TaskDependencyController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.dependencies.destroy');

Route::post('/projects/{project}/tasks/{task}/documents', [TaskDocumentController::class, 'store'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.documents.store');

Route::post('/projects/{project}/tasks/{task}/documents/upload', UploadTaskDocumentController::class)
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.documents.upload');

Route::delete('/projects/{project}/tasks/{task}/documents/{document}', [TaskDocumentController::class, 'destroy'])
    ->middleware('project.member')
    ->scopeBindings()
    ->name('projects.tasks.documents.destroy');

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
