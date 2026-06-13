<?php

declare(strict_types=1);

use App\Models\User;

use function Pest\Laravel\actingAs;

test('guest pages reserve stable scrollbar gutter on the document', function () {
    visit('/')
        ->assertScript('getComputedStyle(document.documentElement).scrollbarGutter === "stable"');
});

test('authenticated app pages reserve stable scrollbar gutter on main content', function () {
    $user = User::factory()->create();
    actingAs($user);

    visit('/dashboard')
        ->assertScript('getComputedStyle(document.querySelector("main")).scrollbarGutter === "stable"');
});
