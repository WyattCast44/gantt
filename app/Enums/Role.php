<?php

declare(strict_types=1);

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Editor = 'editor';
    case Viewer = 'viewer';

    /**
     * Whether this role may invite/remove members and change roles.
     */
    public function canManageMembers(): bool
    {
        return in_array($this, [self::Owner, self::Admin], true);
    }

    /**
     * Whether this role may create or modify project data (tasks, dependencies).
     */
    public function canEdit(): bool
    {
        return in_array($this, [self::Owner, self::Admin, self::Editor], true);
    }

    /**
     * Whether this role may change project settings, calendars, or classification.
     */
    public function canConfigureProject(): bool
    {
        return in_array($this, [self::Owner, self::Admin], true);
    }
}
