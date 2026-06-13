import { buildAxis } from '@/utils/ganttAxis';
import { describe, expect, it } from 'vitest';

describe('buildAxis week zoom', () => {
    // 2027-01-04 is a Monday; this range covers four whole Monday-start weeks.
    const axis = buildAxis('2027-01-04', '2027-01-31', 'week');

    it('builds a secondary band of whole weeks labeled by their Monday', () => {
        expect(axis.secondary).toEqual([
            { key: '2027-01-04', label: 'Jan 4', x: 0, width: 7 * 16, weekend: false },
            { key: '2027-01-11', label: 'Jan 11', x: 7 * 16, width: 7 * 16, weekend: false },
            { key: '2027-01-18', label: 'Jan 18', x: 14 * 16, width: 7 * 16, weekend: false },
            { key: '2027-01-25', label: 'Jan 25', x: 21 * 16, width: 7 * 16, weekend: false },
        ]);
    });

    it('renders weekday letters with weekend flags in the tertiary band', () => {
        // Day cells are one day (16px) wide.
        expect(axis.tertiary[0]).toEqual({ key: '2027-01-04', label: 'M', x: 0, width: 16, weekend: false });
        // Jan 9/10 are Saturday/Sunday.
        const saturday = axis.tertiary.find((segment) => segment.key === '2027-01-09');
        const sunday = axis.tertiary.find((segment) => segment.key === '2027-01-10');
        expect(saturday).toMatchObject({ label: 'S', weekend: true });
        expect(sunday).toMatchObject({ label: 'S', weekend: true });
    });

    it('groups the primary band by month', () => {
        expect(axis.primary).toHaveLength(1);
        expect(axis.primary[0].label).toBe('Jan 2027');
    });

    it('labels a partial leading week by its true Monday while clipping its width', () => {
        // Range starts Wednesday 2027-01-06; the first week is clipped to Wed–Sun (5 days).
        const clipped = buildAxis('2027-01-06', '2027-01-31', 'week');

        expect(clipped.secondary[0]).toEqual({
            key: '2027-01-04',
            label: 'Jan 4',
            x: 0,
            width: 5 * 16,
            weekend: false,
        });
    });
});
