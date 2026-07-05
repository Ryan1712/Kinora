export type RelationCode =
  | 'father'
  | 'mother'
  | 'son'
  | 'daughter'
  | 'spouse'
  | 'sibling'
  | 'paternal_grandfather'
  | 'paternal_grandmother'
  | 'maternal_grandfather'
  | 'maternal_grandmother'
  | 'father_sibling'
  | 'mother_sibling';

export interface CreateClanParams {
  name: string;
  branch_type: 'noi' | 'ngoai' | 'khac';
  admin_full_name: string;
  admin_generation_number: number;
}

export interface InviteMemberParams {
  clan_id: string;
  anchor_person_id: string;
  relation_code: RelationCode;
  invitee_full_name: string;
  invitee_gender?: 'male' | 'female' | 'unknown';
  invitee_user_id?: string;
  invitee_phone_or_email?: string;
}

export interface ProposeChangeParams {
  clan_id: string;
  proposed_relationship_type: 'parent_child' | 'spouse';
  proposed_relationship_with_person_id: string;
}

export interface ClanAdminSettingsParams {
  clan_id: string;
  action: 'update_settings' | 'appoint_deputy' | 'remove_deputy' | 'remove_member';
  name?: string;
  invite_permission?: 'admin_only' | 'all_members';
  person_id?: string;
}

export class ApiError extends Error {}
