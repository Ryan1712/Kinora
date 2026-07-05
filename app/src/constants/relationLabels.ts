import type { RelationCode } from '../api/types';

export const relationLabels: Record<RelationCode, string> = {
  father: 'Cha',
  mother: 'Mẹ',
  son: 'Con trai',
  daughter: 'Con gái',
  spouse: 'Vợ/Chồng',
  sibling: 'Anh/Chị/Em',
  paternal_grandfather: 'Ông nội',
  paternal_grandmother: 'Bà nội',
  maternal_grandfather: 'Ông ngoại',
  maternal_grandmother: 'Bà ngoại',
  father_sibling: 'Bác/Chú/Cô bên nội',
  mother_sibling: 'Bác/Cậu/Dì bên ngoại',
};
