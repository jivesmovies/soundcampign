import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const PLATFORM_CONFIG_KEY = "platform_config";
export const platformConfigSchema = z.object({
  maintenance: z.boolean().default(false),
  registrations: z.boolean().default(true),
  welcomeBonus: z.number().finite().min(0).default(10),
  terms: z.string().max(30000).default(""),
  faq: z.string().max(30000).default(""),
  about: z.string().max(30000).default(""),
  testimonials: z.array(z.string().url()).max(30).default([]),
  licenses: z.array(z.string().url()).max(30).default([]),
});
export type PlatformConfig = z.infer<typeof platformConfigSchema>;
export const DEFAULT_PLATFORM_CONFIG = platformConfigSchema.parse({});

export async function fetchPlatformConfig(): Promise<PlatformConfig> {
  const { data, error } = await supabase.from("platform_settings").select("value").eq("key", PLATFORM_CONFIG_KEY).maybeSingle();
  if (error) throw error;
  return platformConfigSchema.parse(data?.value ?? {});
}

export function usePlatformConfig() {
  return useQuery({ queryKey: [PLATFORM_CONFIG_KEY], queryFn: fetchPlatformConfig, refetchInterval: 5000 });
}

export async function savePlatformConfigField<K extends keyof PlatformConfig>(field: K, value: PlatformConfig[K], expected: PlatformConfig[K]) {
  const parsed = platformConfigSchema.parse({ ...DEFAULT_PLATFORM_CONFIG, [field]: value });
  const { data, error } = await supabase.rpc("save_platform_config_field", {
    p_field: field, p_value: parsed[field], p_expected: expected,
  });
  if (error) throw error;
  return platformConfigSchema.parse(data);
}