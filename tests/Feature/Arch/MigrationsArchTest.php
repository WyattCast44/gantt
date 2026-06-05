<?php

arch('migrations use user stamps', function () {
    $infrastructureMigrations = [
        '0001_01_01_000001_create_cache_table.php',
        '0001_01_01_000002_create_jobs_table.php',
        '0001_01_01_000003_create_activity_log_table.php',
    ];

    $migrations = collect(glob(base_path('database/migrations/*.php')))
        ->reject(fn (string $path): bool => in_array(basename($path), $infrastructureMigrations, true))
        ->values()
        ->all();

    foreach ($migrations as $migration) {
        $contents = file_get_contents($migration);

        expect(str_contains($contents, '->userStamps()'))->toBeTrue();
        expect(str_contains($contents, '->softDeletesWithUserStamps()'))->toBeTrue();
        expect(str_contains($contents, '->timestamps()'))->toBeFalse();
    }
});
