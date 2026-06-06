<?php

declare(strict_types=1);

use App\Enums\BaseClassification;

it('exposes a human-readable label for each case', function (): void {
    expect(BaseClassification::UNCLASSIFIED->label())->toBe('Unclassified')
        ->and(BaseClassification::CUI->label())->toBe('CUI')
        ->and(BaseClassification::CONFIDENTIAL->label())->toBe('Confidential')
        ->and(BaseClassification::SECRET->label())->toBe('Secret')
        ->and(BaseClassification::TOP_SECRET->label())->toBe('Top Secret');
});

it('orders levels strictly from unclassified to top secret', function (): void {
    $levels = array_map(
        fn (BaseClassification $c): int => $c->level(),
        [
            BaseClassification::UNCLASSIFIED,
            BaseClassification::CUI,
            BaseClassification::CONFIDENTIAL,
            BaseClassification::SECRET,
            BaseClassification::TOP_SECRET,
        ],
    );

    expect($levels)->toBe([0, 1, 2, 3, 4]);
});

it('dominates equal or lower classifications but not higher ones', function (): void {
    expect(BaseClassification::SECRET->dominates(BaseClassification::CUI))->toBeTrue()
        ->and(BaseClassification::SECRET->dominates(BaseClassification::SECRET))->toBeTrue()
        ->and(BaseClassification::CUI->dominates(BaseClassification::SECRET))->toBeFalse();
});
