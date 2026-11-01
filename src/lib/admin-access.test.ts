import { describe, expect, it, vi } from "vitest";
import { assertAdminAccess, checkSuperAdmin } from "./admin-access";

describe("administrator management access", () => {
  it("allows Super Admin management without a legacy admin role", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(assertAdminAccess({ supabase: { rpc }, userId: "super" })).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "super", _role: "super_admin" });
  });
  it("keeps regular administrators eligible for ownership-checked training management", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    await expect(assertAdminAccess({ supabase: { rpc }, userId: "admin" })).resolves.toBeUndefined();
  });
  it("rejects members from administrator management", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    await expect(assertAdminAccess({ supabase: { rpc }, userId: "member" })).rejects.toThrow("Forbidden");
  });
  it("does not silently downgrade Super Admin on role-read failures", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "Role lookup failed" } });
    await expect(checkSuperAdmin({ supabase: { rpc }, userId: "super" })).rejects.toThrow("Role lookup failed");
  });
});