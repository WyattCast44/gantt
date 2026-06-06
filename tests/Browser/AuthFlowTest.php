<?php

declare(strict_types=1);

use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertAuthenticated;

test('guest pages render without javascript errors', function () {
    $pages = visit(['/', '/login', '/register', '/forgot-password']);

    $pages->assertNoSmoke();
});

test('a visitor can register through the browser', function () {
    $page = visit('/register');

    $page->assertSee('Create Account')
        ->fill('name', 'Casey Planner')
        ->fill('email', 'casey@example.com')
        ->fill('password', 'password')
        ->fill('password_confirmation', 'password')
        ->click('button[type=submit]')
        ->assertPathIs('/dashboard')
        ->assertNoJavascriptErrors()
        ->assertSee('Dashboard');

    assertAuthenticated();

    expect(User::where('email', 'casey@example.com')->exists())->toBeTrue();
});

test('a registered user can sign in through the browser', function () {
    $user = User::factory()->create();

    $page = visit('/login');

    $page->assertSee('Sign In')
        ->fill('email', $user->email)
        ->fill('password', 'password')
        ->click('button[type=submit]')
        ->assertPathIs('/dashboard')
        ->assertNoJavascriptErrors()
        ->assertSee('Dashboard');

    assertAuthenticated();
});

test('invalid credentials keep the visitor on the login page', function () {
    $user = User::factory()->create();

    $page = visit('/login');

    $page->fill('email', $user->email)
        ->fill('password', 'wrong-password')
        ->click('button[type=submit]')
        ->assertPathIs('/login')
        ->assertNoJavascriptErrors()
        ->assertSee('Sign In');
});

test('an authenticated user can sign out through the browser', function () {
    $user = User::factory()->create();

    actingAs($user);

    $page = visit('/dashboard');

    $page->assertSee('Dashboard')
        ->click('Log out')
        ->assertNoJavascriptErrors()
        ->assertSee('Sign In');
});
