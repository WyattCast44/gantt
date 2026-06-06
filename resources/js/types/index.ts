export type ThemePreference = 'light' | 'dark' | 'system';

export interface User {
    id: number;
    name: string;
    email: string;
    theme: ThemePreference;
}

export interface Auth {
    user: User | null;
}

export interface SharedProps {
    auth: Auth;
    flash: {
        status: string | null;
    };
    [key: string]: unknown;
}
