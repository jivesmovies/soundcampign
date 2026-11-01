import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { adminAccountSchema } from "@/lib/admin-account";
import type { Database } from "@/integrations/supabase/types";

export const trainingAccountSchema = adminAccountSchema.extend({
  balance: z.number().finite().optional(),
  vipLevel: z.number().int().min(0).max(7).optional(),
  inviteCode: z.string().trim().max(64).optional(),
});

export async function provisionTrainingAccount(client: SupabaseClient<Database>, input: z.infer<typeof trainingAccountSchema>, ownerId: string) {
  const data = trainingAccountSchema.parse(input);
  const { data: existing, error: lookupError } = await client.from("profiles").select("id").ilike("username", data.username).limit(1).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) throw new Error("This username is already taken");
  let referredBy: string | null = null;
  if (data.inviteCode) {
    const { data: ref, error } = await client.from("profiles").select("id").ilike("invite_code", data.inviteCode.replace(/[\\%_]/g, "\\$&")).maybeSingle();
    if (error) throw error;
    if (!ref) throw new Error("Invitation code not found");
    referredBy = ref.id;
  }
  const { data: created, error } = await client.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { username: data.username, display_name: data.displayName || data.username } });
  if (error) throw error;
  if (!created.user) throw new Error("Could not create training account");
  const uid = created.user.id;
  try {
    const { error: profileError } = await client.from("profiles").upsert({ id: uid, username: data.username, display_name: data.displayName || data.username, phone: data.phone || null, balance: data.balance ?? 0, vip_level: data.vipLevel ?? 0, is_training: true, referred_by: referredBy, created_by: ownerId });
    if (profileError) throw profileError;
    if (referredBy) {
      const { data: ref, error: readError } = await client.from("profiles").select("team_size").eq("id", referredBy).single();
      if (readError) throw readError;
      const { error: updateError } = await client.from("profiles").update({ team_size: Number(ref.team_size) + 1 }).eq("id", referredBy);
      if (updateError) throw updateError;
    }
    return { ok: true, userId: uid };
  } catch (cause) {
    const { error: cleanupError } = await client.auth.admin.deleteUser(uid);
    if (cleanupError) throw new Error("Training account setup failed. Remove the incomplete account before retrying.");
    throw cause;
  }
}