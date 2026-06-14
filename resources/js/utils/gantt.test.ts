import { fitToSpan, focusScrollLeft, FOCUS_PADDING_RATIO, ZOOM_CONFIG, zoomToFitSpan } from '@/utils/gantt';
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

describe('fitToSpan', () => {
    const viewport = 1000;
    const pad = 100;

    it('picks the finest zoom that frames a short span and pads its origin', () => {
        const { zoom, rangeStart, anchorScroll } = fitToSpan('2026-01-01', '2026-01-05', viewport, 2, pad);

        // Five days fit at day zoom; the origin sits `pad` days before the span.
        expect(zoom).toBe('day');
        expect(rangeStart).toBe('2025-09-23');

        // The span bar starts at pad*dayWidth and is framed with focus padding.
        const barX = pad * ZOOM_CONFIG[zoom].dayWidth;
        expect(anchorScroll).toBe(focusScrollLeft(barX, 5 * ZOOM_CONFIG[zoom].dayWidth, viewport));
    });

    it('coarsens the zoom so a long span still fits the viewport', () => {
        const short = fitToSpan('2026-01-01', '2026-01-05', viewport, 2, pad).zoom;
        const long = fitToSpan('2026-01-01', '2027-01-01', viewport, 2, pad).zoom;

        expect(ZOOM_CONFIG[long].dayWidth).toBeLessThan(ZOOM_CONFIG[short].dayWidth);
    });

    it('keeps deep rows visible by respecting minDepth', () => {
        // A deep subtree may not fold its rows: only zooms with maxDepth >= 5 qualify.
        const { zoom } = fitToSpan('2026-01-01', '2026-06-01', viewport, 5, pad);

        expect(ZOOM_CONFIG[zoom].maxDepth).toBeGreaterThanOrEqual(5);
    });
});
