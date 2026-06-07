export type ThemePreference = 'light' | 'dark' | 'system';

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<Role, string> = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
};

export type ProjectStatus = 'active' | 'completed';

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
