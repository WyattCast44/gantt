<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BaseClassification;
use App\Models\Document;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(3, true);
        $filename = Str::slug($name).'.pdf';

        return [
            'project_id' => Project::factory(),
            'name' => $name,
            'description' => fake()->optional()->sentence(),
            'disk' => Document::DISK,
            'path' => 'documents/'.fake()->numberBetween(1, 50).'/'.Str::random(40).'.pdf',
            'original_filename' => $filename,
            'mime_type' => 'application/pdf',
            'size_bytes' => fake()->numberBetween(1024, 5_000_000),
            'checksum' => hash('sha256', fake()->uuid()),
            'base_classification' => BaseClassification::UNCLASSIFIED,
            'special_access_required' => false,
            'handling_caveats' => null,
            'programs' => null,
        ];
    }

    /**
     * Attach the document to a specific project.
     */
    public function forProject(Project $project): static
    {
        return $this->state(['project_id' => $project->id]);
    }

    /**
     * Set the document's classification marking.
     */
    public function classifiedAs(BaseClassification $level): static
    {
        return $this->state(['base_classification' => $level]);
    }

    /**
     * Make the document an image instead of a PDF.
     */
    public function image(): static
    {
        return $this->state(fn (array $attributes): array => [
            'mime_type' => 'image/png',
            'original_filename' => Str::slug((string) $attributes['name']).'.png',
            'path' => 'documents/'.fake()->numberBetween(1, 50).'/'.Str::random(40).'.png',
        ]);
    }
}
