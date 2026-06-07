import { CLASSIFICATIONS, type BaseClassificationValue } from '@/types';

/** Classification options a document may use, capped at the project baseline. */
export function allowedClassifications(baseline: BaseClassificationValue): typeof CLASSIFICATIONS {
    const ceiling = CLASSIFICATIONS.findIndex((c) => c.value === baseline);

    return CLASSIFICATIONS.slice(0, ceiling === -1 ? CLASSIFICATIONS.length : ceiling + 1);
}
