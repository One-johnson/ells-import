"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar";
import { AdminShellSkeleton } from "@/components/admin/admin-shell-skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/admin");
      router.replace(`/login?next=${next}`);
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isAdmin, router, pathname]);

  if (isLoading) {
    return <AdminShellSkeleton />;
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <SidebarProvider
      className="flex h-full min-h-0 w-full !min-h-0 flex-1 flex-col gap-0 md:h-auto md:flex-row"
      style={{ ["--sidebar-width" as string]: "14rem" }}
    >
      <AdminAppSidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="bg-background/95 border-border flex h-12 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger className="shrink-0" />
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            ← Back to store
          </Link>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </div>
    </SidebarProvider>
  );
}
