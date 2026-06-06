/**
 * Shared focus-visible rings (keyboard). Matches Button treatment: outer ring + offset in
 * light/dark, or inset for full-bleed row links.
 */

/** Primary solid fill */
export const focusRingPrimary =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-800 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950';

/** Ghost, text links, secondary surfaces — accent ring + canvas-colored offset */
export const focusRingNeutral =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950';

/** Native checkboxes — compact ring, focus-visible */
export const focusRingCheckbox =
    'rounded border-border text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-border-dark dark:bg-neutral-800 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-neutral-950';

/** Text inputs, selects, textareas (md) */
export const focusRingInputMd =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:border-accent-500 dark:focus-visible:ring-accent-400 dark:focus-visible:ring-offset-neutral-950 dark:focus-visible:border-accent-400';

/** Guest / large inputs */
export const focusRingInputLg =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 focus-visible:border-accent-500 dark:focus-visible:border-accent-400';
