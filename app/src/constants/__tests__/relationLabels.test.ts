import { relationLabels } from '../relationLabels';
import type { RelationCode } from '../../api/types';

describe('relationLabels', () => {
  it('has a Vietnamese label for all 12 relation codes', () => {
    const codes: RelationCode[] = [
      'father',
      'mother',
      'son',
      'daughter',
      'spouse',
      'sibling',
      'paternal_grandfather',
      'paternal_grandmother',
      'maternal_grandfather',
      'maternal_grandmother',
      'father_sibling',
      'mother_sibling',
    ];

    for (const code of codes) {
      expect(relationLabels[code]).toBeTruthy();
    }
  });
});
