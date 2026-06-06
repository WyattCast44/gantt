<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this
            ->configureModelMorphMap()
            ->configureMigrationMacros();
    }

    private function configureModelMorphMap(): static
    {
        Relation::enforceMorphMap([
            'user' => User::class,
            'project' => Project::class,
        ]);

        return $this;
    }

    private function configureMigrationMacros(): static
    {
        Blueprint::macro('userStamps', function (): void {
            $this->timestamps();
            $this->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $this->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
        });

        Blueprint::macro('softDeletesWithUserStamps', function (): void {
            $this->softDeletes();
            $this->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
        });

        return $this;
    }
}
