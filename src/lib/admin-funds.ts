import { supabase } from "@/integrations/supabase/client";

export async function adjustAdminAccountFunds(userId: string, amount: number, mode: "add" | "deduct", target: "balance" | "today") {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than 0");
  const delta = Number(((mode === "deduct" ? -1 : 1) * amount).toFixed(2));
  const { data, error } = await supabase.rpc("admin_adjust_account_funds", { p_user: userId, p_delta: delta, p_earned_delta: target === "today" ? delta : 0 });
  if (error) throw error;
  return data;
}