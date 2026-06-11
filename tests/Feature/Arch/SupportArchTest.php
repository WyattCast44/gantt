<?php

declare(strict_types=1);

// The support layer (including the propagation engine) is pure domain logic:
// value objects and algorithms over enums and dates. It must never reach into
// Eloquent, the database, or the HTTP layer — models orchestrate it, not the
// other way around.
arch('support classes stay pure')
    ->expect('App\Support')
    ->toOnlyUse([
        'App\Enums',
        'App\Support',
        'Carbon\CarbonImmutable',
    ]);
