<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Enums\BaseClassification;

trait HasClassification
{
    /**
     * Merge the classification casts into the model. Laravel calls this
     * automatically when booting a model that uses the trait, so models do
     * not need to repeat these casts in their own casts() method.
     */
    public function initializeHasClassification(): void
    {
        $this->mergeCasts([
            'base_classification' => BaseClassification::class,
            'special_access_required' => 'boolean',
            'handling_caveats' => 'array',
            'programs' => 'array',
        ]);
    }

    /**
     * The model's baseline classification.
     */
    public function baseClassification(): BaseClassification
    {
        return $this->base_classification;
    }
}
