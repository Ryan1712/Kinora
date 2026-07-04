import { createClient } from "npm:@supabase/supabase-js@2";
import { getServiceClient, getRequestUserId, jsonResponse } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  const userId = await getRequestUserId(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { clan_id, new_admin_person_id, password } = await req.json();
  if (!clan_id || !new_admin_person_id || !password) {
    return jsonResponse({ error: "clan_id, new_admin_person_id, and password are required" }, 400);
  }

  const svc = getServiceClient();
  const { data: caller } = await svc
    .from("persons")
    .select("id, role")
    .eq("clan_id", clan_id)
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!caller || caller.role !== "admin") return jsonResponse({ error: "not permitted" }, 403);

  const { data: callerAccount } = await svc.from("users").select("email").eq("id", userId).single();
  if (!callerAccount?.email) return jsonResponse({ error: "caller has no email on file" }, 500);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const verifyClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: verifyErr } = await verifyClient.auth.signInWithPassword({
    email: callerAccount.email,
    password,
  });
  if (verifyErr) return jsonResponse({ error: "incorrect password" }, 401);

  const { data: target } = await svc.from("persons").select("role").eq("id", new_admin_person_id).eq("clan_id", clan_id).single();
  if (!target) return jsonResponse({ error: "target person not found in this clan" }, 404);
  if (!target.role) return jsonResponse({ error: "target has no active account in this clan" }, 409);

  const { error: transferErr } = await svc.rpc("transfer_admin_role", {
    p_caller_person_id: caller.id,
    p_target_person_id: new_admin_person_id,
  });
  if (transferErr) return jsonResponse({ error: transferErr.message }, 500);

  return jsonResponse({});
});
