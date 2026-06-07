<?php

declare(strict_types=1);

namespace App\Enums;

enum TaskStatus: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Blocked = 'blocked';
    case Complete = 'complete';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::NotStarted => 'Not started',
            self::InProgress => 'In progress',
            self::Blocked => 'Blocked',
            self::Complete => 'Complete',
        };
    }
}
