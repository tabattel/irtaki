import { describe, expect, it } from 'vitest';

import { HAFS_RECITERS } from './audio';

describe('Hafs audio reciters', () => {
  it('contains the six v1.0.0 reciters', () => {
    expect(HAFS_RECITERS).toHaveLength(6);
  });

  it('uses Hafs for every v1.0.0 reciter', () => {
    expect(HAFS_RECITERS.every((reciter) => reciter.riwaya === 'hafs')).toBe(
      true,
    );
  });

  it('has unique reciter ids', () => {
    const ids = HAFS_RECITERS.map((reciter) => reciter.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
