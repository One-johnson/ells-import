"use client";

import { useStoreSettings } from "@/components/store-settings-provider";
import { Construction } from "lucide-react";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { maintenanceMode, storeName } = useStoreSettings();

  if (maintenanceMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Construction className="size-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Under maintenance
            </h1>
            <p className="text-muted-foreground">
              {storeName} is currently being updated. Please check back soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
