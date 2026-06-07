export type ThemePreference = 'light' | 'dark' | 'system';

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<Role, string> = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
};

export type ProjectStatus = 'active' | 'completed';

export type DurationUnitValue = 'calendar_days' | 'work_days';

/** JavaScript weekday index: 0 = Sunday … 6 = Saturday. */
export interface WorkCalendar {
    non_working_weekdays: number[];
}

export type BaseClassificationValue = 'unclassified' | 'cui' | 'confidential' | 'secret' | 'top_secret';

/** Classification markings ordered from least to most restrictive. */
export const CLASSIFICATIONS: { value: BaseClassificationValue; label: string }[] = [
    { value: 'unclassified', label: 'Unclassified' },
    { value: 'cui', label: 'CUI' },
    { value: 'confidential', label: 'Confidential' },
    { value: 'secret', label: 'Secret' },
    { value: 'top_secret', label: 'Top Secret' },
];

export interface User {
    id: number;
    name: string;
    email: string;
    theme: ThemePreference;
}

export interface Auth {
    user: User | null;
}

/** Enum value paired with its human-readable label. */
export interface Labeled<T extends string = string> {
    value: T;
    label: string;
}

/** Lightweight project shape used by the workspace switcher and lists. */
export interface ProjectSummary {
    id: number;
    name: string;
    role: Role | null;
    status: ProjectStatus;
}

/** Per-viewer ability flags resolved from ProjectPolicy. */
export interface ProjectAbilities {
    update: boolean;
    manageMembers: boolean;
    updateSettings: boolean;
    delete: boolean;
}

/** Full project workspace payload (ProjectResource). */
export interface Project {
    id: number;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    status: Labeled<ProjectStatus>;
    base_classification: Labeled;
    is_archived: boolean;
    viewer_role: Role | null;
    can: ProjectAbilities;
    /** Non-working weekdays for schedule math; future source is project settings. */
    work_calendar: WorkCalendar;
}

/** A project member (ProjectMemberResource). */
export interface ProjectMember {
    id: number;
    name: string;
    email: string;
    role: Labeled<Role>;
    is_owner: boolean;
}

/** A project invitation (ProjectInvitationResource). */
export interface ProjectInvitation {
    id: number;
    email: string;
    role: Labeled<Role>;
    status: Labeled;
    is_expired: boolean;
    expires_at: string | null;
    created_at: string | null;
    invited_by?: string | null;
    project?: { name: string };
    accept_url: string;
}

/** A comment attached to a document or task (CommentResource). */
export interface Comment {
    id: number;
    body: string;
    base_classification: Labeled<BaseClassificationValue>;
    author?: { id: number; name: string };
    created_at: string | null;
    updated_at: string | null;
    can: {
        update: boolean;
        delete: boolean;
    };
}

/** A project document (DocumentResource). */
export interface Document {
    id: number;
    name: string;
    description: string | null;
    type: Labeled;
    mime_type: string;
    original_filename: string;
    size_bytes: number;
    size_label: string;
    base_classification: Labeled<BaseClassificationValue>;
    uploaded_by?: string | null;
    created_at: string | null;
    updated_at: string | null;
    download_url: string;
    preview_url: string;
    comments: Comment[];
    activities: Activity[];
}

export type TaskStatusValue = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export type RiskLevelValue = 'low' | 'medium' | 'high';

export const TASK_STATUSES: { value: TaskStatusValue; label: string }[] = [
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'complete', label: 'Complete' },
];

export const RISK_LEVELS: { value: RiskLevelValue; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

/** A predecessor/successor reference in a task's dependency list (DependencyResource). */
export interface Dependency {
    id: number;
    name: string;
}

/** A parent or child task summary shown on the detail view. */
export interface TaskSummary {
    id: number;
    name: string;
    status: Labeled<TaskStatusValue>;
    percent_complete: number;
}

/** A project task (TaskResource). Recursive via `children`. */
export interface Task {
    id: number;
    name: string;
    description: string | null;
    parent_id: number | null;
    /** Parent task summary (detail view only). */
    parent?: TaskSummary | null;
    hierarchy_level: number;
    sort_order: number;
    start_date: string | null;
    duration_days: number;
    duration_unit: Labeled<DurationUnitValue>;
    /** Derived (start + duration, day-grain); null when unscheduled. */
    end_date: string | null;
    is_date_locked: boolean;
    status: Labeled<TaskStatusValue>;
    risk_level: Labeled<RiskLevelValue>;
    base_classification: Labeled<BaseClassificationValue>;
    organization: string | null;
    tags: string[];
    percent_complete: number;
    created_by?: string | null;
    created_at: string | null;
    updated_at: string | null;
    /** Direct children (present on the index tree and the detail subtree). */
    children: Task[];
    /** Whether any descendant is not complete (detail view only). */
    has_incomplete_descendants?: boolean;
    /** Predecessor tasks this task depends on (detail view only). */
    predecessors?: Dependency[];
    /** Successor tasks that depend on this one (detail view only). */
    successors?: Dependency[];
    /** Attached project documents (detail view only). */
    documents?: Document[];
    /** Comment thread (detail view only). */
    comments?: Comment[];
    /** Audit trail (detail view only). */
    activities?: Activity[];
}

/**
 * A single append-only audit-log entry (ActivityResource). `attribute_changes`
 * holds the before/after values: `attributes` is the new state, `old` the
 * previous one. Created entries omit `old`; deleted entries omit `attributes`.
 */
export interface Activity {
    id: number;
    event: string | null;
    description: string;
    causer?: { id: number; name: string } | null;
    attribute_changes: {
        attributes?: Record<string, unknown>;
        old?: Record<string, unknown>;
    } | null;
    /** Free-form context for action entries (e.g. downloads); null for most entries. */
    properties: Record<string, unknown> | null;
    created_at: string | null;
}

export interface SharedProps {
    auth: Auth;
    flash: {
        status: string | null;
    };
    /** The few most-recently-updated projects (incl. the current one) for the switcher. */
    recentProjects: ProjectSummary[];
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    [key: string]: unknown;
}
