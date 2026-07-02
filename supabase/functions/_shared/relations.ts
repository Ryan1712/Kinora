import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type RelationCode =
  | "father" | "mother" | "son" | "daughter" | "spouse" | "sibling"
  | "paternal_grandfather" | "paternal_grandmother"
  | "maternal_grandfather" | "maternal_grandmother"
  | "father_sibling" | "mother_sibling";

export interface DirectTarget {
  type: "parent_child" | "spouse";
  counterpartPersonId: string;
  newPersonGeneration: number;
}

async function getPerson(svc: SupabaseClient, id: string) {
  const { data, error } = await svc.from("persons").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function findParent(svc: SupabaseClient, personId: string, gender?: "male" | "female") {
  let query = svc
    .from("relationships")
    .select("from_person_id, persons!relationships_from_person_id_fkey(gender)")
    .eq("to_person_id", personId)
    .eq("type", "parent_child");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!gender) return data?.[0]?.from_person_id as string | undefined;
  const match = data?.find((r: any) => r.persons?.gender === gender);
  return match?.from_person_id as string | undefined;
}

async function createPlaceholder(svc: SupabaseClient, clanId: string, generation: number, gender: "male" | "female" | "unknown", label: string) {
  const { data, error } = await svc
    .from("persons")
    .insert({ clan_id: clanId, full_name: label, generation_number: generation, gender })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function linkParent(svc: SupabaseClient, clanId: string, parentId: string, childId: string) {
  const { error } = await svc
    .from("relationships")
    .insert({ clan_id: clanId, from_person_id: parentId, to_person_id: childId, type: "parent_child" });
  if (error) throw new Error(error.message);
}

async function getOrCreateSpecificParent(
  svc: SupabaseClient, clanId: string, personId: string, gender: "male" | "female",
): Promise<{ id: string; created: boolean }> {
  const existing = await findParent(svc, personId, gender);
  if (existing) return { id: existing, created: false };
  const person = await getPerson(svc, personId);
  const label = gender === "male" ? "(Cha - chua ro)" : "(Me - chua ro)";
  const placeholderId = await createPlaceholder(svc, clanId, person.generation_number - 1, gender, label);
  await linkParent(svc, clanId, placeholderId, personId);
  return { id: placeholderId, created: true };
}

async function getOrCreateAnyParent(svc: SupabaseClient, clanId: string, personId: string) {
  const existing = await findParent(svc, personId);
  if (existing) return existing;
  const person = await getPerson(svc, personId);
  const placeholderId = await createPlaceholder(svc, clanId, person.generation_number - 1, "unknown", "(Ong/Ba - chua ro)");
  await linkParent(svc, clanId, placeholderId, personId);
  return placeholderId;
}

export async function resolveDirectTarget(
  svc: SupabaseClient, clanId: string, anchorPersonId: string, relationCode: RelationCode,
): Promise<DirectTarget> {
  const anchor = await getPerson(svc, anchorPersonId);

  switch (relationCode) {
    case "father": {
      const existing = await findParent(svc, anchorPersonId, "male");
      if (existing) throw new Error("anchor already has a recorded father");
      return { type: "parent_child", counterpartPersonId: anchorPersonId, newPersonGeneration: anchor.generation_number - 1 };
    }
    case "mother": {
      const existing = await findParent(svc, anchorPersonId, "female");
      if (existing) throw new Error("anchor already has a recorded mother");
      return { type: "parent_child", counterpartPersonId: anchorPersonId, newPersonGeneration: anchor.generation_number - 1 };
    }
    case "son":
    case "daughter":
      return { type: "parent_child", counterpartPersonId: anchorPersonId, newPersonGeneration: anchor.generation_number + 1 };
    case "spouse": {
      const { data: existingSpouse } = await svc
        .from("relationships")
        .select("id")
        .eq("type", "spouse")
        .or(`from_person_id.eq.${anchorPersonId},to_person_id.eq.${anchorPersonId}`);
      if (existingSpouse && existingSpouse.length > 0) throw new Error("anchor already has a recorded spouse");
      return { type: "spouse", counterpartPersonId: anchorPersonId, newPersonGeneration: anchor.generation_number };
    }
    case "sibling": {
      const parentId = await getOrCreateAnyParent(svc, clanId, anchorPersonId);
      return { type: "parent_child", counterpartPersonId: parentId, newPersonGeneration: anchor.generation_number };
    }
    case "paternal_grandfather":
    case "paternal_grandmother": {
      const father = await getOrCreateSpecificParent(svc, clanId, anchorPersonId, "male");
      const targetGender = relationCode === "paternal_grandfather" ? "male" : "female";
      const existingGrandparent = await findParent(svc, father.id, targetGender);
      if (existingGrandparent) throw new Error("father already has this grandparent recorded");
      return { type: "parent_child", counterpartPersonId: father.id, newPersonGeneration: anchor.generation_number - 2 };
    }
    case "maternal_grandfather":
    case "maternal_grandmother": {
      const mother = await getOrCreateSpecificParent(svc, clanId, anchorPersonId, "female");
      const targetGender = relationCode === "maternal_grandfather" ? "male" : "female";
      const existingGrandparent = await findParent(svc, mother.id, targetGender);
      if (existingGrandparent) throw new Error("mother already has this grandparent recorded");
      return { type: "parent_child", counterpartPersonId: mother.id, newPersonGeneration: anchor.generation_number - 2 };
    }
    case "father_sibling": {
      const father = await getOrCreateSpecificParent(svc, clanId, anchorPersonId, "male");
      const grandparentId = await getOrCreateAnyParent(svc, clanId, father.id);
      return { type: "parent_child", counterpartPersonId: grandparentId, newPersonGeneration: anchor.generation_number - 1 };
    }
    case "mother_sibling": {
      const mother = await getOrCreateSpecificParent(svc, clanId, anchorPersonId, "female");
      const grandparentId = await getOrCreateAnyParent(svc, clanId, mother.id);
      return { type: "parent_child", counterpartPersonId: grandparentId, newPersonGeneration: anchor.generation_number - 1 };
    }
    default:
      throw new Error("unsupported relation_code");
  }
}
