type AccessContext = { supabase: { rpc: (name: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }; userId: string };

export async function checkSuperAdmin(context: AccessContext) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function assertAdminAccess(context: AccessContext) {
  if (await checkSuperAdmin(context)) return;
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden");
}