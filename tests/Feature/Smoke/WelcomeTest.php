<?php

declare(strict_types=1);

use function Pest\Laravel\get;

test('welcome page is accessible', function () {
    get('/')->assertSuccessful();
});
