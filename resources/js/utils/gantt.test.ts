import { focusScrollLeft, FOCUS_PADDING_RATIO, zoomToFitSpan } from '@/utils/gantt';
import { describe, expect, it } from 'vitest';

describe('zoomToFitSpan', () => {
    const viewport = 1000;

    it('picks a finer zoom for a short task than for a long one', () => {
        const short = zoomToFitSpan(5, viewport, 2);
        const long = zoomToFitSpan(400, viewport, 2);

        expect(short).toBe('day');
        expect(long).toBe('year');
    });

    it('respects maxDepth for deep tasks', () => {
        const zoom = zoomToFitSpan(5, viewport, 5);

        expect(zoom).toBe('day');
        expect(zoom).not.toBe('year');
    });

    it('falls back to the coarsest depth-compatible zoom when the span exceeds every level', () => {
        expect(zoomToFitSpan(5000, viewport, 1)).toBe('year');
    });
});

describe('focusScrollLeft', () => {
    it('pads a bar that fits within the viewport', () => {
        const padding = 800 * FOCUS_PADDING_RATIO;
        expect(focusScrollLeft(500, 100, 800)).toBe(500 - padding);
    });

    it('centers a bar that is wider than the viewport', () => {
        expect(focusScrollLeft(1000, 2000, 800)).toBe(1000 + 1000 - 400);
    });

    it('never returns a negative scroll offset', () => {
        expect(focusScrollLeft(10, 50, 800)).toBe(0);
    });
});
