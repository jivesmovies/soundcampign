import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { provisionTrainingAccount } from "./training-account";

describe("training account management", () => {
  it("creates a confirmed member and assigns management to its creator", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "training" } }, error: null });
    const lookup = { select: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), upsert };
    const client = { from: vi.fn(() => lookup), auth: { admin: { createUser, deleteUser: vi.fn() } } } as unknown as SupabaseClient<Database>;
    await provisionTrainingAccount(client, { email: "training@example.com", password: "TestPassword26", username: "Training26", balance: 125, vipLevel: 2 }, "creator");
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email_confirm: true }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ created_by: "creator", is_training: true, balance: 125, vip_level: 2 }));
  });
  it("rolls back an incomplete training account rather than reporting success", async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const lookup = { select: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), upsert: vi.fn().mockResolvedValue({ error: new Error("Profile failed") }) };
    const client = { from: vi.fn(() => lookup), auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: "incomplete" } }, error: null }), deleteUser } } } as unknown as SupabaseClient<Database>;
    await expect(provisionTrainingAccount(client, { email: "training@example.com", password: "TestPassword26", username: "Training26" }, "creator")).rejects.toThrow("Profile failed");
    expect(deleteUser).toHaveBeenCalledWith("incomplete");
  });
});