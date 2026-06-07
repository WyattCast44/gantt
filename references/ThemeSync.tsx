import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { SharedProps } from '@/types';
import { applyThemePreference } from '@/utils/theme';

/**
 * Keeps the root `dark` class in sync with shared Inertia `auth.user.theme`.
 */
export default function ThemeSync(): null {
    const page = usePage<{ props: SharedProps }>();
    const { auth } = page.props as unknown as SharedProps;
    const theme = auth.user?.theme ?? 'system';

    useEffect(() => {
        return applyThemePreference(theme);
    }, [theme]);

    return null;
}
