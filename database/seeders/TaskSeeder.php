<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\BaseClassification;
use App\Enums\DurationUnit;
use App\Enums\ProjectStatus;
use App\Enums\RiskLevel;
use App\Enums\Role;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    /**
     * Seed a realistic, multi-tier operational-test campaign into a project.
     * When no project/user is supplied (e.g. running this seeder directly), it
     * provisions its own so the timeline has something to show.
     */
    public function run(?Project $project = null, ?User $user = null): void
    {
        $user ??= User::query()->first() ?? User::factory()->create();

        // Anchor the campaign so it straddles today: early phases are done, the
        // middle is in progress, the tail is still ahead.
        $base = CarbonImmutable::today()->subDays(70);

        $project ??= Project::factory()
            ->withOwner($user)
            ->withMember($user, Role::Owner)
            ->create([
                'name' => 'F-35 Block 4 Operational Test Campaign',
                'description' => 'Operational test and evaluation of the Block 4 sensor, weapons, and mission-systems upgrades.',
                'start_date' => $base,
                'end_date' => $base->addDays(210),
                'status' => ProjectStatus::Active,
                'base_classification' => BaseClassification::UNCLASSIFIED,
            ]);

        /** @var array<string, Task> $created */
        $created = [];
        /** @var array<string, array<int, string>> $dependencies */
        $dependencies = [];

        $this->createNodes($this->blueprint(), $project, $base, null, 1, $created, $dependencies);

        // Wire finish-to-start dependencies once every task exists.
        foreach ($dependencies as $key => $predecessorKeys) {
            foreach ($predecessorKeys as $predecessorKey) {
                if (isset($created[$key], $created[$predecessorKey])) {
                    $created[$key]->predecessors()->syncWithoutDetaching([
                        $created[$predecessorKey]->id => ['type' => 'finish_to_start'],
                    ]);
                }
            }
        }

        // Normalize the seeded schedule through the rules engine, exactly as
        // live edits would leave it: parents become their subtree envelopes
        // and violated movable successors are pushed. Pinned tasks stay put —
        // the blueprint's deliberate overlap (DV demo) survives as a visible
        // conflict on the timeline. Quiet query-builder updates: seeding needs
        // no audit entries or events.
        foreach ($project->previewSchedule()->moves as $taskId => $move) {
            Task::query()->whereKey($taskId)->update([
                'start_date' => $move->toStart,
                'duration_days' => $move->toDuration,
                'duration_unit' => $move->toUnit,
            ]);
        }
    }

    /**
     * Recursively create a tier of tasks, setting structural fields and dates.
     *
     * @param  array<int, array<string, mixed>>  $nodes
     * @param  array<string, Task>  $created
     * @param  array<string, array<int, string>>  $dependencies
     */
    private function createNodes(array $nodes, Project $project, CarbonImmutable $base, ?Task $parent, int $level, array &$created, array &$dependencies): void
    {
        $sortOrder = 0;

        foreach ($nodes as $node) {
            /** @var TaskStatus $status */
            $status = $node['status'];

            $task = Task::factory()->create([
                'project_id' => $project->id,
                'parent_id' => $parent?->id,
                'hierarchy_level' => $level,
                'sort_order' => $sortOrder++,
                'name' => $node['name'],
                'description' => $node['description'] ?? null,
                'start_date' => $base->addDays($node['offset']),
                'duration_days' => $node['duration'],
                'duration_unit' => DurationUnit::WorkDays,
                // Reactive by default (duration fixed, dates slide with the
                // rules engine); blueprint nodes opt into pinning.
                'lock_start' => (bool) ($node['pinned'] ?? false),
                'lock_end' => false,
                'lock_duration' => true,
                'status' => $status,
                'percent_complete' => $this->percentFor($status),
                'risk_level' => $node['risk'],
                'organization' => $node['org'] ?? null,
                'tags' => $node['tags'] ?? null,
                'base_classification' => BaseClassification::UNCLASSIFIED,
            ]);

            $created[$node['key']] = $task;

            if (! empty($node['depends'])) {
                $dependencies[$node['key']] = $node['depends'];
            }

            if (! empty($node['children'])) {
                $this->createNodes($node['children'], $project, $base, $task, $level + 1, $created, $dependencies);
            }
        }
    }

    /**
     * A representative percent-complete for a status (in-progress gets jitter).
     */
    private function percentFor(TaskStatus $status): int
    {
        return match ($status) {
            TaskStatus::Complete => 100,
            TaskStatus::InProgress => fake()->numberBetween(35, 75),
            TaskStatus::Blocked => 15,
            TaskStatus::NotStarted => 0,
        };
    }

    /**
     * The campaign work-breakdown structure. Offsets are calendar days from the
     * campaign start; keys wire up finish-to-start dependencies.
     *
     * @return array<int, array<string, mixed>>
     */
    private function blueprint(): array
    {
        return [
            [
                'key' => 'planning',
                'name' => 'Test Planning & Readiness',
                'status' => TaskStatus::Complete,
                'risk' => RiskLevel::Low,
                'org' => 'Program Office',
                'offset' => 0,
                'duration' => 28,
                'tags' => ['planning'],
                'children' => [
                    ['key' => 'test-plan', 'name' => 'Test Plan Development', 'status' => TaskStatus::Complete, 'risk' => RiskLevel::Low, 'org' => 'OT Squadron', 'offset' => 0, 'duration' => 14, 'pinned' => true],
                    ['key' => 'range-coord', 'name' => 'Range & Airspace Coordination', 'status' => TaskStatus::Complete, 'risk' => RiskLevel::Medium, 'org' => 'Program Office', 'offset' => 10, 'duration' => 12],
                    ['key' => 'safety-review', 'name' => 'Safety Review Board', 'status' => TaskStatus::Complete, 'risk' => RiskLevel::Medium, 'org' => 'OT Squadron', 'offset' => 20, 'duration' => 8, 'depends' => ['test-plan']],
                ],
            ],
            [
                'key' => 'integration',
                'name' => 'Aircraft Integration',
                'status' => TaskStatus::InProgress,
                'risk' => RiskLevel::Medium,
                'org' => 'Sensor Vendor',
                'offset' => 28,
                'duration' => 56,
                'depends' => ['planning'],
                'children' => [
                    [
                        'key' => 'sensor-integration',
                        'name' => 'Sensor Integration',
                        'status' => TaskStatus::InProgress,
                        'risk' => RiskLevel::Medium,
                        'org' => 'Sensor Vendor',
                        'offset' => 28,
                        'duration' => 40,
                        'tags' => ['sensor'],
                        'children' => [
                            ['key' => 'eo-ir', 'name' => 'EO/IR Calibration', 'status' => TaskStatus::Complete, 'risk' => RiskLevel::Low, 'org' => 'Sensor Vendor', 'offset' => 28, 'duration' => 12, 'tags' => ['sensor', 'eo-ir']],
                            ['key' => 'sar', 'name' => 'SAR Verification', 'status' => TaskStatus::InProgress, 'risk' => RiskLevel::High, 'org' => 'Sensor Vendor', 'offset' => 40, 'duration' => 14, 'depends' => ['eo-ir'], 'tags' => ['sensor', 'radar']],
                            ['key' => 'data-link', 'name' => 'Data Link Integration', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Medium, 'org' => 'Comms Detachment', 'offset' => 54, 'duration' => 14, 'depends' => ['sar']],
                        ],
                    ],
                    [
                        'key' => 'weapons-integration',
                        'name' => 'Weapons Integration',
                        'status' => TaskStatus::NotStarted,
                        'risk' => RiskLevel::High,
                        'org' => 'Weapons Test Group',
                        'offset' => 50,
                        'duration' => 34,
                        'depends' => ['sensor-integration'],
                        'tags' => ['weapons'],
                        'children' => [
                            ['key' => 'captive-carry', 'name' => 'Captive Carry', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Medium, 'org' => 'Weapons Test Group', 'offset' => 50, 'duration' => 14],
                            ['key' => 'separation', 'name' => 'Separation Testing', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::High, 'org' => 'Weapons Test Group', 'offset' => 64, 'duration' => 20, 'depends' => ['captive-carry']],
                        ],
                    ],
                ],
            ],
            [
                'key' => 'mission-systems',
                'name' => 'Mission Systems Test',
                'status' => TaskStatus::NotStarted,
                'risk' => RiskLevel::Medium,
                'org' => 'EW Lab',
                'offset' => 84,
                'duration' => 40,
                'depends' => ['integration'],
                'children' => [
                    ['key' => 'ew-suite', 'name' => 'Electronic Warfare Suite', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::High, 'org' => 'EW Lab', 'offset' => 84, 'duration' => 24, 'tags' => ['ew']],
                    ['key' => 'comms-test', 'name' => 'Communications Test', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Low, 'org' => 'Comms Detachment', 'offset' => 100, 'duration' => 18],
                    // Deliberately conflicted: a date-pinned demo scheduled
                    // before its EW-suite predecessor can finish, so the
                    // timeline shows a red dashed (violated) dependency.
                    ['key' => 'dv-demo', 'name' => 'DV Day Demonstration', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Medium, 'org' => 'Program Office', 'offset' => 95, 'duration' => 2, 'depends' => ['ew-suite'], 'pinned' => true, 'tags' => ['demo']],
                ],
            ],
            [
                'key' => 'opeval',
                'name' => 'Operational Evaluation',
                'status' => TaskStatus::NotStarted,
                'risk' => RiskLevel::High,
                'org' => 'OT Squadron',
                'offset' => 124,
                'duration' => 45,
                'depends' => ['mission-systems'],
                'children' => [
                    ['key' => 'mission-rehearsal', 'name' => 'Mission Rehearsal', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Medium, 'org' => 'OT Squadron', 'offset' => 124, 'duration' => 15],
                    ['key' => 'live-fly', 'name' => 'Live-Fly Evaluation', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::High, 'org' => 'OT Squadron', 'offset' => 139, 'duration' => 30, 'depends' => ['mission-rehearsal']],
                ],
            ],
            [
                'key' => 'reporting',
                'name' => 'Reporting & Closeout',
                'status' => TaskStatus::NotStarted,
                'risk' => RiskLevel::Low,
                'org' => 'Data Analysis Cell',
                'offset' => 169,
                'duration' => 30,
                'depends' => ['opeval'],
                'children' => [
                    ['key' => 'data-reduction', 'name' => 'Data Reduction & Analysis', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Medium, 'org' => 'Data Analysis Cell', 'offset' => 169, 'duration' => 18],
                    ['key' => 'final-report', 'name' => 'Final Report', 'status' => TaskStatus::NotStarted, 'risk' => RiskLevel::Low, 'org' => 'Program Office', 'offset' => 187, 'duration' => 12, 'depends' => ['data-reduction']],
                ],
            ],
        ];
    }
}
