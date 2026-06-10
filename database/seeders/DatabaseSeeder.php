<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // A realistic, fully populated operational-test campaign with a deep
        // task hierarchy and dependencies — the primary demo project.
        $this->callWith(TaskSeeder::class, ['user' => $user]);

        // A few additional projects so the index and switcher have variety.
        Project::factory()
            ->count(3)
            ->withOwner($user)
            ->withMember($user, Role::Owner)
            ->create();
    }
}
