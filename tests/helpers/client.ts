import { createClient, SupabaseClient } from "@supabase/supabase-js";

function url(): string {
  return process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
}

export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url(), key, { auth: { persistSession: false } });
}

export async function createTestUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user!.id, email: data.user!.email! };
}

export async function signInAs(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const key = process.env.SUPABASE_ANON_KEY!;
  const client = createClient(url(), key, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

export async function accessTokenFor(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw error ?? new Error("no session");
  return data.session.access_token;
}

export function functionUrl(name: string): string {
  return `${url()}/functions/v1/${name}`;
}
