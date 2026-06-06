<?php

declare(strict_types=1);

namespace App\Enums;

enum ProjectStatus: string
{
    case Active = 'active';
    case Completed = 'completed';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Completed => 'Completed',
        };
    }

    /**
     * Whether the project is in its working (non-terminal) state.
     */
    public function isActive(): bool
    {
        return $this === self::Active;
    }
}
