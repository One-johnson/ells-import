"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  PackageSearch,
  Settings2,
  ShoppingCart,
  Star,
  Store,
  Users,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, exact: false },
  { href: "/admin/support", label: "Support", icon: MessageSquare, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: Star, exact: false },
  { href: "/admin/inventory", label: "Low stock", icon: PackageSearch, exact: false },
  { href: "/admin/notify", label: "Broadcast", icon: BellRing, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/settings", label: "Store settings", icon: Settings2, exact: false },
] as const;

export function AdminAppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border z-20 md:top-[calc(3.5rem+env(safe-area-inset-top,0px))] md:!bottom-auto md:!h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] md:!min-h-0"
    >
      <SidebarHeader className="border-sidebar-border border-b p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[active=true]:bg-transparent"
            >
              <Link href="/admin" className="hover:bg-sidebar-accent/80">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-6">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Admin</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">Ells Import</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : (pathname?.startsWith(item.href) ?? false);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border gap-2 border-t p-2 group-data-[collapsible=icon]:p-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
          asChild
        >
          <Link href="/" title="View storefront" className="group-data-[collapsible=icon]:justify-center">
            <Store className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:sr-only">View storefront</span>
          </Link>
        </Button>
        <div className="text-sidebar-foreground/80 text-xs group-data-[collapsible=icon]:sr-only">
          <p className="truncate font-medium" title={user?.email ?? ""}>
            {user?.name || user?.email}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
          title="Sign out"
          onClick={() => void logout()}
        >
          <LogOut
            className="hidden size-4 shrink-0 group-data-[collapsible=icon]:block"
            aria-hidden
          />
          <span className="group-data-[collapsible=icon]:sr-only">Sign out</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
