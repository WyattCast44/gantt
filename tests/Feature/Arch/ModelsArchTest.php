<?php

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;

// App\Models\Activity is the append-only audit model extending Spatie's
// Activity. It is intentionally exempt from the domain-model conventions below
// (no soft deletes / user stamps / Fillable / factory / morph alias).
arch('models')
    ->expect('App\Models')
    ->toExtend('Illuminate\Database\Eloquent\Model')
    ->ignoring('User')
    ->ignoring('App\Models\Activity')
    ->ignoring('App\Models\Concerns');

arch('models have casts')
    ->expect('App\Models')
    ->toHaveMethod('casts')
    ->ignoring('App\Models\Activity')
    ->ignoring('App\Models\Concerns');

arch('models use soft deletes')
    ->expect('App\Models')
    ->toUse('Illuminate\Database\Eloquent\SoftDeletes')
    ->ignoring('App\Models\Activity');

arch('models use user stamps')
    ->expect('App\Models')
    ->toUse('App\Models\Concerns\HasUserStamps')
    ->ignoring('App\Models\Activity');

arch('models declare a Fillable attribute', function () {
    $models = getModels();

    foreach ($models as $model) {
        $attributes = (new ReflectionClass($model))->getAttributes(Fillable::class);

        expect($attributes)->not->toBeEmpty(
            sprintf('The %s model is missing the #[Fillable] attribute.', $model),
        );
    }
});

arch('ensure factories', function () {
    $models = getModels();

    foreach ($models as $model) {
        /* @var \Illuminate\Database\Eloquent\Factories\HasFactory $model */
        expect($model::factory())
            ->toBeInstanceOf(Factory::class);
    }
});

arch('ensure datetime casts', function () {
    $models = getModels();

    foreach ($models as $model) {
        /* @var \Illuminate\Database\Eloquent\Factories\HasFactory $model */
        $instance = $model::factory()->create();

        $dates = collect($instance->getAttributes())
            ->filter(fn ($_, $key) => str_ends_with($key, '_at'))
            ->reject(fn ($_, $key) => in_array($key, ['created_at', 'updated_at']));

        foreach ($dates as $key => $value) {
            expect($instance->getCasts())->toHaveKey(
                $key,
                'datetime',
                sprintf(
                    'The %s cast on the %s model is not a datetime cast.',
                    $key,
                    $model,
                ),
            );
        }
    }
});

arch('models have morph maps', function () {
    $models = getModels();

    foreach ($models as $model) {
        /* @var \Illuminate\Database\Eloquent\Factories\HasFactory $model */
        $alias = Relation::getMorphAlias($model);

        expect($alias)->toBeString()->not->toContain('App\Models');
    }
});

/**
 * Get all models in the app/Models directory.
 *
 * @return array<int, class-string<Model>>
 */
function getModels(): array
{
    $models = glob(base_path('app/Models/*.php'));

    return collect($models)
        ->map(function ($file) {
            return 'App\Models\\'.basename($file, '.php');
        })
        // Activity is the append-only audit model (extends Spatie's Activity);
        // it is exempt from the domain-model conventions asserted above.
        ->reject(fn (string $model): bool => $model === 'App\Models\Activity')
        ->values()
        ->toArray();
}
