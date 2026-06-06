<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\BaseClassification;
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

        // classification fields
        Blueprint::macro('classification', function (): void {
            $this->string('base_classification')->default(BaseClassification::UNCLASSIFIED->value);
            $this->boolean('special_access_required')->default(false);
            $this->json('handling_caveats')->nullable(); // SCI fields, for example: ['SI', 'TK']
            $this->json('programs')->nullable(); // [['name' => 'PID', 'level' => 'top_secret'|'secret']] // basically a list of the SAR programs and levels for the row
        });

        return $this;
    }
}
