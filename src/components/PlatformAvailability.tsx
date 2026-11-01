import { useMe } from "@/lib/hooks";
import { usePlatformConfig } from "@/lib/platform-config";
import { Wrench } from "lucide-react";

export function PlatformAvailability({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const { data: config } = usePlatformConfig();
  if (me && !me.isAdmin && config?.maintenance) {
    return <div className="mx-auto max-w-xl py-16 text-center"><Wrench className="mx-auto mb-4 h-10 w-10 text-primary" /><h1 className="text-2xl font-bold">Platform maintenance</h1><p className="mt-3 text-muted-foreground">SoundCampaign is temporarily unavailable. Please check back shortly.</p></div>;
  }
  return <>{children}</>;
}