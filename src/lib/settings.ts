import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRYPTO_ASSETS, type CryptoAsset } from "@/lib/crypto";

export type DepositAddress = { address: string; network: string };
export type DepositAddresses = Record<CryptoAsset, DepositAddress>;

export const DEFAULT_ADDRESSES: DepositAddresses = Object.fromEntries(
  CRYPTO_ASSETS.map((c) => [c.key, { address: c.address, network: c.network }]),
) as DepositAddresses;

export async function fetchDepositAddresses(): Promise<DepositAddresses> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit_addresses")
    .maybeSingle();
  if (error) throw error;
  const value = (data?.value ?? {}) as Partial<DepositAddresses>;
  return { ...DEFAULT_ADDRESSES, ...value };
}

export function useDepositAddresses() {
  return useQuery({ queryKey: ["deposit-addresses"], queryFn: fetchDepositAddresses });
}

export async function saveDepositAddresses(value: DepositAddresses) {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key: "deposit_addresses", value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export type TrendingSong = {
  id: string;
  position: number;
  title: string;
  artist: string;
  poster: string | null;
  audio_url: string | null;
  duration: string | null;
};

export function useTrendingSongs() {
  return useQuery({
    queryKey: ["trending-songs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trending_songs")
        .select("id, position, title, artist, poster, audio_url, duration")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrendingSong[];
    },
  });
}

/** Upload an audio/image file for a trending song and return a long-lived signed URL. */
export async function uploadTrendingMedia(file: File) {
  const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("trending-media").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("trending-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (sErr) throw sErr;
  return data.signedUrl;
}

export type WarehouseSongMap = Record<string, import("@/lib/warehouse").Song[]>;

export async function fetchWarehouseSongs(): Promise<WarehouseSongMap> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "warehouse_songs")
    .maybeSingle();
  if (error) throw error;
  const map = (data?.value ?? {}) as WarehouseSongMap;
  const { realAudio } = await import("@/lib/warehouse");
  const out: WarehouseSongMap = {};
  for (const [k, songs] of Object.entries(map)) {
    out[k] = (songs ?? []).map((s) => {
      // Admin-uploaded audio wins; placeholder/missing audio gets the real clip for its title.
      if (s.audio && !/soundhelix/i.test(s.audio)) return s;
      const key = String(s.name ?? "").replace(/\s*\((?:G\d+|Premium)\)\s*$/i, "").trim();
      const [title, artist] = key.split(" — ");
      return title && artist ? { ...s, audio: realAudio(title, artist) } : s;
    });
  }
  return out;
}

export function useWarehouseSongs() {
  return useQuery({
    queryKey: ["warehouse-songs"],
    queryFn: fetchWarehouseSongs,
    refetchInterval: 5000,
  });
}

export async function saveWarehouseSongs(value: WarehouseSongMap) {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key: "warehouse_songs", value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
