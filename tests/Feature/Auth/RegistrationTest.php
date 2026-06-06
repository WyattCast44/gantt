<?php

declare(strict_types=1);

use App\Enums\ThemePreference;
use App\Models\User;

use function Pest\Laravel\assertAuthenticated;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

test('registration screen can be rendered', function () {
    get('/register')->assertSuccessful();
});

test('new users can register', function () {
    post('/register', [
        'name' => 'Test Planner',
        'email' => 'planner@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect('/dashboard');

    assertAuthenticated();

    expect(User::where('email', 'planner@example.com')->exists())->toBeTrue();
});

test('a newly registered user defaults to the system theme', function () {
    post('/register', [
        'name' => 'Test Planner',
        'email' => 'planner@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    expect(User::firstWhere('email', 'planner@example.com')->theme)
        ->toBe(ThemePreference::System);
});
