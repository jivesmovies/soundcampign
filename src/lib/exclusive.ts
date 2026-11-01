import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/lib/warehouse";

export type TaskSettings = {
  user_id: string;
  group_seed: number;
  upgrade_position: number | null;
  group_assigned?: boolean;
};

export type ExclusiveTask = {
  id: string;
  user_id: string;
  position: number;
  name: string;
  amount: number;
  commission: number;
  poster: string | null;
  consumed: boolean;
};

export function useTaskSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ["task-settings", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_task_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as TaskSettings | null) ?? null;
    },
  });
}

export function useExclusiveTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ["exclusive-tasks", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_exclusive_tasks")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExclusiveTask[];
    },
  });
}

/** Replace the base catalogue songs with premium exclusives at their exact positions. */
export function applyExclusives(songs: Song[], exclusives: ExclusiveTask[]): Song[] {
  if (!exclusives.length) return songs;
  const out = [...songs];
  for (const ex of exclusives) {
    if (ex.consumed) continue;
    const idx = ex.position - 1;
    if (idx < 0 || idx >= out.length) continue;
    out[idx] = {
      id: `exclusive-${ex.id}`,
      name: ex.name,
      poster: ex.poster || out[idx].poster,
      audio: out[idx].audio,
      description: "Exclusive premium track assigned to your account.",
      amount: Number(ex.amount),
      commission: Number(ex.commission),
      exclusive: true,
      exclusiveId: ex.id,
    };
  }
  return out;
}

function exclusiveSong(ex: ExclusiveTask, fallback: Song | undefined): Song {
  return {
    id: `exclusive-${ex.id}`,
    name: ex.name,
    poster: ex.poster || fallback?.poster || "",
    audio: fallback?.audio || "",
    description: "Exclusive premium track assigned to your account.",
    amount: Number(ex.amount),
    commission: Number(ex.commission),
    exclusive: true,
    exclusiveId: ex.id,
  };
}

/**
 * Build the remaining task queue so each unconsumed premium lands exactly on
 * its admin-set task number, counted from the user's real progress.
 * Index 0 of the result is task #(submitted + 1).
 * A premium whose number has already passed appears as the very next task.
 */
export function buildTaskQueue(
  baseSongs: Song[],
  exclusives: ExclusiveTask[],
  submittedNames: Set<string>,
  submittedCount: number,
  quota: number,
): Song[] {
  const pending = exclusives
    .filter((e) => !e.consumed && !submittedNames.has(e.name))
    .sort((a, b) => a.position - b.position);
  const premiumNames = new Set(pending.map((e) => e.name));
  const base = baseSongs.filter((s) => !submittedNames.has(s.name) && !premiumNames.has(s.name));
  const out: Song[] = [];
  let b = 0;
  for (let pos = submittedCount + 1; pos <= quota; pos++) {
    const exIdx = pending.findIndex((e) => e.position <= pos);
    if (exIdx >= 0) {
      out.push(exclusiveSong(pending[exIdx], base[b] ?? baseSongs[0]));
      pending.splice(exIdx, 1);
    } else if (b < base.length) {
      out.push(base[b++]);
    } else break;
  }
  return out;
}
