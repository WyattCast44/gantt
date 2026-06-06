<?php

declare(strict_types=1);

use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

test('login screen can be rendered', function () {
    get('/login')->assertSuccessful();
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect('/dashboard');

    assertAuthenticated();
});

test('users cannot authenticate with an invalid password', function () {
    $user = User::factory()->create();

    post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    assertGuest();
});

test('authenticated users can log out', function () {
    $user = User::factory()->create();

    actingAs($user)->post('/logout')->assertRedirect('/');

    assertGuest();
});

test('the dashboard requires authentication', function () {
    get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can reach the dashboard', function () {
    $user = User::factory()->create();

    actingAs($user)->get('/dashboard')->assertSuccessful();
});
