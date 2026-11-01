import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminAccountSchema, provisionAdminAccount } from "@/lib/admin-account";
import { assertAdminAccess, checkSuperAdmin } from "@/lib/admin-access";
import { provisionTrainingAccount, trainingAccountSchema } from "@/lib/training-account";

async function assertAdmin(context: { supabase: any; userId: string }) {
  await assertAdminAccess(context);
}

/** Only the Super Admin may change data; restricted admins are read-only. */
async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data: isSuper, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!isSuper) throw new Error("Forbidden: Super Admin only");
}

async function isSuperAdmin(context: { supabase: any; userId: string }) {
  return checkSuperAdmin(context);
}

/** Super Admin, or a restricted admin acting on a training account they created. */
async function assertSuperOrOwner(context: { supabase: any; userId: string }, targetId: string) {
  await assertAdmin(context);
  if (await isSuperAdmin(context)) return;
  const { data, error } = await context.supabase.rpc("admin_owns_training", { _admin: context.userId, _user: targetId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: you can only manage training accounts you created");
}

/** Permanently delete a user account (auth user + cascading profile rows). Admin only. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperOrOwner(context, data.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type TrainingInput = {
  email: string;
  password: string;
  username: string;
  displayName?: string;
  phone?: string;
  balance?: number;
  vipLevel?: number;
  inviteCode?: string;
};

/** Create a virtual/training account that can log in to the user panel. Admin only. */
export const createTrainingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => trainingAccountSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    return provisionTrainingAccount(supabaseAdmin, data, context.userId);
  });

/** List all training accounts with their referrer. Admin only. */
export const listTrainingAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("is_training", true)
      .order("created_at", { ascending: false });
    const superAdmin = await isSuperAdmin(context);
    const visible = superAdmin ? rows : (rows ?? []).filter((r) => r.created_by === context.userId);
    if (error) throw new Error(error.message);

    const refIds = [...new Set((visible ?? []).map((r) => r.referred_by).filter(Boolean))] as string[];
    let refMap: Record<string, string> = {};
    if (refIds.length) {
      const { data: refs } = await supabaseAdmin
        .from("profiles").select("id, username, display_name").in("id", refIds);
      refMap = Object.fromEntries((refs ?? []).map((r) => [r.id, r.display_name || r.username]));
    }

    const { data: emails } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = Object.fromEntries((emails?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return (visible ?? []).map((r) => ({
      ...r,
      email: emailMap[r.id] ?? "",
      referrerName: r.referred_by ? (refMap[r.referred_by] ?? "—") : null,
    }));
  });

/** List real and training user accounts with their email and referrer. Admin only. */
export const listUserAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const refIds = [...new Set((rows ?? []).map((r) => r.referred_by).filter(Boolean))] as string[];
    let refMap: Record<string, string> = {};
    if (refIds.length) {
      const { data: refs } = await supabaseAdmin
        .from("profiles").select("id, username, display_name").in("id", refIds);
      refMap = Object.fromEntries((refs ?? []).map((r) => [r.id, r.display_name || r.username]));
    }

    const { data: emails } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = Object.fromEntries((emails?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return (rows ?? []).map((r) => ({
      ...r,
      email: emailMap[r.id] ?? "",
      referrerName: r.referred_by ? (refMap[r.referred_by] ?? "—") : null,
    }));
  });

/** Update a training account's login/profile details. Admin only. */
export const updateTrainingAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string; email?: string; password?: string; username?: string;
    displayName?: string; phone?: string; balance?: number;
  }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperOrOwner(context, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authPatch: Record<string, string> = {};
    if (data.email) authPatch['email'] = data.email.trim().toLowerCase();
    if (data.password) authPatch['password'] = data.password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, authPatch);
      if (error) throw new Error(error.message);
    }

    const patch: { username?: string; display_name?: string; phone?: string; balance?: number } = {};
    if (data.username) patch.username = data.username;
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.balance !== undefined) patch.balance = data.balance;
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Delete every training account. Admin only. */
export const deleteAllTrainingAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const superAdmin = await isSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select("id").eq("is_training", true);
    if (!superAdmin) q = q.eq("created_by", context.userId);
    const { data: rows, error: listError } = await q;
    if (listError) throw new Error(listError.message);
    let count = 0;
    for (const r of rows ?? []) {
      if (r.id === context.userId) continue;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(r.id);
      if (error) throw new Error(`Deleted ${count} accounts. ${error.message}`);
      count += 1;
    }
    return { ok: true, count };
  });

/**
 * Pay the caller's referrer a 20% bonus on a submitted song's profit.
 * The bonus is minted on top — nothing is deducted from the submitter.
 */
export const payReferralBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profit: number }) => input)
  .handler(async ({ data, context }) => {
    const profit = Number(data.profit);
    if (!isFinite(profit) || profit <= 0) return { credited: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: self } = await supabaseAdmin
      .from("profiles").select("referred_by").eq("id", context.userId).maybeSingle();
    const refId = self?.referred_by;
    if (!refId) return { credited: 0 };

    const bonus = Number((profit * 0.2).toFixed(2));
    if (bonus <= 0) return { credited: 0 };

    const { data: ref } = await supabaseAdmin
      .from("profiles").select("balance, total_earned").eq("id", refId).maybeSingle();
    if (!ref) return { credited: 0 };

    await supabaseAdmin.from("profiles").update({
      balance: Number((Number(ref.balance) + bonus).toFixed(2)),
      total_earned: Number((Number(ref.total_earned) + bonus).toFixed(2)),
    }).eq("id", refId);

    await supabaseAdmin.from("mock_transactions").insert({
      user_id: refId, kind: "referral", amount: bonus, status: "approved",
      note: "Referral bonus · 20% of downline submission profit",
    });

    return { credited: bonus };
  });

/** Link the signed-in user to a referrer by invitation code (used at signup). */
export const linkReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const code = data.code?.trim();
    if (!code) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ref } = await supabaseAdmin
      .from("profiles").select("id, team_size").ilike("invite_code", code).maybeSingle();
    if (!ref || ref.id === context.userId) return { ok: false };
    await supabaseAdmin.from("profiles").update({ referred_by: ref.id }).eq("id", context.userId);
    await supabaseAdmin.from("profiles")
      .update({ team_size: Number(ref.team_size ?? 0) + 1 }).eq("id", ref.id);
    return { ok: true };
  });

/** Update any account's login/profile details (users, training or admin). Admin only. */
export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string; email?: string; password?: string; username?: string;
    displayName?: string; phone?: string; balance?: number; creditScore?: number;
  }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperOrOwner(context, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authPatch: Record<string, string> = {};
    if (data.email) authPatch['email'] = data.email.trim().toLowerCase();
    if (data.password) authPatch['password'] = data.password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, authPatch);
      if (error) throw new Error(error.message);
    }

    const patch: { username?: string; display_name?: string; phone?: string; balance?: number; credit_score?: number } = {};
    if (data.username) patch.username = data.username;
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.balance !== undefined) patch.balance = data.balance;
    if (data.creditScore !== undefined && Number.isFinite(data.creditScore)) {
      patch.credit_score = Math.max(0, Math.min(1000, Math.round(data.creditScore)));
    }
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** List administrator login details for the Super Admin only. */
export const listAdminAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin.from("user_roles")
      .select("user_id, role").in("role", ["admin", "super_admin"]);
    if (error) throw new Error(error.message);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    if (!ids.length) return [];
    const { data: profiles, error: profileError } = await supabaseAdmin.from("profiles").select("*").in("id", ids);
    if (profileError) throw new Error(profileError.message);
    return Promise.all((profiles ?? []).map(async (profile) => {
      const { data, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (authError) throw new Error(authError.message);
      return { ...profile, email: data.user.email ?? "", isSuper: (roles ?? []).some((r) => r.user_id === profile.id && r.role === "super_admin") };
    }));
  });

/** Create a confirmed administrator with the exact assigned login credentials. Super Admin only. */
export const createAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminAccountSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    return provisionAdminAccount(supabaseAdmin, data);
  });

/** Promote an existing user to Admin or remove Admin. Super Admin only. */
export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot change your own role");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: roleError } = await supabaseAdmin.from("user_roles")
      .select("role").eq("user_id", data.userId);
    if (roleError) throw new Error(roleError.message);
    if ((target ?? []).some((r) => r.role === "super_admin")) throw new Error("Super Admin roles cannot be changed");
    if (data.makeAdmin) {
      if (!(target ?? []).some((r) => r.role === "admin")) {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" });
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete()
        .eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
