<?php

declare(strict_types=1);

namespace App\Enums;

enum BaseClassification: string
{
    case UNCLASSIFIED = 'unclassified';
    case CUI = 'cui';
    case CONFIDENTIAL = 'confidential';
    case SECRET = 'secret';
    case TOP_SECRET = 'top_secret';

    /**
     * Human-readable marking suitable for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::UNCLASSIFIED => 'Unclassified',
            self::CUI => 'CUI',
            self::CONFIDENTIAL => 'Confidential',
            self::SECRET => 'Secret',
            self::TOP_SECRET => 'Top Secret',
        };
    }

    /**
     * Numeric severity used for ordering and constraint comparisons.
     * Higher values indicate more restrictive classifications.
     */
    public function level(): int
    {
        return match ($this) {
            self::UNCLASSIFIED => 0,
            self::CUI => 1,
            self::CONFIDENTIAL => 2,
            self::SECRET => 3,
            self::TOP_SECRET => 4,
        };
    }

    /**
     * Whether this classification is at least as restrictive as another.
     * The seam future baseline enforcement uses to ensure a field's marking
     * does not exceed the project's baseline classification.
     */
    public function dominates(self $other): bool
    {
        return $this->level() >= $other->level();
    }
}
