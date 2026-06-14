<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\BaseClassification;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Scout\Jobs\MakeSearchableUniquely;
use Laravel\Scout\Jobs\RemoveFromSearchUniquely;
use Laravel\Scout\Scout;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this
            ->configureModelMorphMap()
            ->configureMigrationMacros()
            ->configureCommands()
            ->configureDates()
            ->configureModels()
            ->configurePasswordValidation()
            ->configureJSONResources()
            ->configureScoutEngine();
    }

    private function configureModelMorphMap(): static
    {
        Relation::enforceMorphMap([
            'user' => User::class,
            'project' => Project::class,
            'project_invitation' => ProjectInvitation::class,
            'document' => Document::class,
            'comment' => Comment::class,
            'task' => Task::class,
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

    private function configureCommands(): static
    {
        DB::prohibitDestructiveCommands(
            $this->app->environment('production')
        );

        return $this;
    }

    private function configureDates(): static
    {
        Date::use(CarbonImmutable::class);

        return $this;
    }

    private function configureModels(): static
    {
        Model::shouldBeStrict(! $this->app->environment('production'));

        return $this;
    }

    private function configurePasswordValidation(): static
    {
        Password::defaults(fn () => $this->app->environment('production') ? Password::min(8) : null);

        return $this;
    }

    private function configureJSONResources(): static
    {
        JsonResource::withoutWrapping();

        return $this;
    }

    private function configureScoutEngine(): static
    {
        Scout::makeSearchableUsing(MakeSearchableUniquely::class);
        Scout::removeFromSearchUsing(RemoveFromSearchUniquely::class);

        return $this;
    }
}
