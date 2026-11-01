import { describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { DEFAULT_PLATFORM_CONFIG, savePlatformConfigField } from "./platform-config";

describe("durable platform settings", () => {
  it("saves the actual selected setting rather than only displaying success", async () => {
    rpc.mockResolvedValueOnce({ data: { ...DEFAULT_PLATFORM_CONFIG, about: "Updated profile" }, error: null });
    await expect(savePlatformConfigField("about", "Updated profile", "Original profile")).resolves.toMatchObject({ about: "Updated profile" });
    expect(rpc).toHaveBeenCalledWith("save_platform_config_field", { p_field: "about", p_value: "Updated profile", p_expected: "Original profile" });
  });
  it("does not report success when an outdated value is rejected", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("This setting changed in another session") });
    await expect(savePlatformConfigField("about", "Stale update", "Older value")).rejects.toThrow("changed in another session");
  });
  it("persists registration and maintenance switches as boolean values", async () => {
    rpc.mockResolvedValueOnce({ data: { ...DEFAULT_PLATFORM_CONFIG, maintenance: true }, error: null });
    await expect(savePlatformConfigField("maintenance", true, false)).resolves.toMatchObject({ maintenance: true });
    expect(rpc).toHaveBeenLastCalledWith("save_platform_config_field", { p_field: "maintenance", p_value: true, p_expected: false });
  });
});