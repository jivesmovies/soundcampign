import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_CONFIG_KEY } from "@/lib/platform-config";

export function usePlatformRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const refreshSettings = () => {
      for (const key of [PLATFORM_CONFIG_KEY, "warehouse-songs", "deposit-addresses", "events-config"]) void qc.invalidateQueries({ queryKey: [key] });
    };
    const refreshAccounts = () => {
      for (const key of ["me", "admin-users", "training-accounts", "admin-overview"]) void qc.invalidateQueries({ queryKey: [key] });
    };
    const channel = supabase.channel(`platform-management-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_settings" }, refreshSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshAccounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "trending_songs" }, () => void qc.invalidateQueries({ queryKey: ["trending-songs"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => void qc.invalidateQueries({ queryKey: ["announcements"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_task_settings" }, () => void qc.invalidateQueries({ queryKey: ["task-settings"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_exclusive_tasks" }, () => void qc.invalidateQueries({ queryKey: ["exclusive-tasks"] }))
      .subscribe((status) => { if (status === "SUBSCRIBED") refreshSettings(); });
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
}