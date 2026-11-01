import { describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { adjustAdminAccountFunds } from "./admin-funds";

describe("administrator fund management", () => {
  it("adds exact cents without overwriting the current saved balance", async () => {
    rpc.mockResolvedValueOnce({ data: { balance: 112.5 }, error: null });
    await expect(adjustAdminAccountFunds("training", 12.5, "add", "balance")).resolves.toEqual({ balance: 112.5 });
    expect(rpc).toHaveBeenLastCalledWith("admin_adjust_account_funds", { p_user: "training", p_delta: 12.5, p_earned_delta: 0 });
  });
  it("deducts the requested amount rather than adding it", async () => {
    rpc.mockResolvedValueOnce({ data: { balance: 110.25 }, error: null });
    await adjustAdminAccountFunds("training", 2.25, "deduct", "balance");
    expect(rpc).toHaveBeenLastCalledWith("admin_adjust_account_funds", { p_user: "training", p_delta: -2.25, p_earned_delta: 0 });
  });
  it("adjusts wallet and earnings together for earnings changes", async () => {
    rpc.mockResolvedValueOnce({ data: {}, error: null });
    await adjustAdminAccountFunds("training", 15, "add", "today");
    expect(rpc).toHaveBeenLastCalledWith("admin_adjust_account_funds", { p_user: "training", p_delta: 15, p_earned_delta: 15 });
  });
  it("reports a permission failure rather than claiming the funds changed", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("Not your training account") });
    await expect(adjustAdminAccountFunds("other", 12.5, "add", "balance")).rejects.toThrow("Not your training account");
  });
});