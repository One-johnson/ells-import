"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Bell,
  Settings,
  Store,
} from "lucide-react";
import { SkeletonTable } from "@/components/skeletons";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionToken, isLoading: authLoading } = useAuth();
  const user = useQuery(api.users.getMe, sessionToken ? { sessionToken } : "skip");

  useEffect(() => {
    if (authLoading) return;
    if (!sessionToken) {
      router.replace("/sign-in?redirect=/admin");
      return;
    }
    if (user === undefined) return; // still loading
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }
  }, [authLoading, sessionToken, user, router]);

  if (authLoading || !sessionToken || user === undefined || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-2xl px-4">
          <SkeletonTable rows={6} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-2 py-3 outline-none rounded-md hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/logo-source.png"
              alt="Ell's Import"
              width={32}
              height={32}
              className="h-8 w-auto object-contain shrink-0"
            />
            <span className="text-sidebar-foreground font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
              Ell&apos;s Import
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to store">
                <Link href="/">
                  <Store className="size-4" />
                  <span>Store</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">Admin</span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
