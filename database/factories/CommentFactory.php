<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BaseClassification;
use App\Models\Comment;
use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comment>
 */
class CommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'commentable_type' => 'document',
            'commentable_id' => Document::factory(),
            'body' => fake()->paragraph(),
            'base_classification' => BaseClassification::UNCLASSIFIED,
            'special_access_required' => false,
            'handling_caveats' => null,
            'programs' => null,
        ];
    }

    /**
     * Attach the comment to a specific document.
     */
    public function forDocument(Document $document): static
    {
        return $this->state([
            'commentable_type' => 'document',
            'commentable_id' => $document->id,
        ]);
    }

    /**
     * Set the comment's classification marking.
     */
    public function classifiedAs(BaseClassification $level): static
    {
        return $this->state(['base_classification' => $level]);
    }
}
