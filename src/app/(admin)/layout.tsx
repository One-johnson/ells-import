"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Bell,
  Settings,
  Store,
  UserCircle,
  Package,
  Mail,
  Headphones,
  LogOut,
} from "lucide-react";
import { SkeletonTable } from "@/components/skeletons";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminSidebarFooterLink() {
  const { setOpenMobile } = useSidebar();
  return (
    <Link
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setOpenMobile(false)}
    >
      <Store className="size-4" />
      <span>View store</span>
    </Link>
  );
}

function AdminSidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
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
                <Link href={href} onClick={() => setOpenMobile(false)}>
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionToken, setSessionToken, isLoading: authLoading } = useAuth();
  const user = useQuery(api.users.getMe, sessionToken ? { sessionToken } : "skip");
  const logout = useMutation(api.users.logout);

  async function handleSignOut() {
    if (!sessionToken) return;
    await logout({ sessionToken });
    setSessionToken(null);
    toast.success("Signed out");
    router.replace("/");
    router.refresh();
  }

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
          <AdminSidebarNav />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View store (opens in new tab)">
                <AdminSidebarFooterLink />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted sm:px-3"
            >
              <Store className="size-4" />
              <span className="hidden sm:inline">View store</span>
            </Link>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="User menu"
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground ring-2 ring-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="flex items-center gap-2">
                    <UserCircle className="size-4" /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="flex items-center gap-2">
                    <Package className="size-4" /> Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2">
                    <LayoutDashboard className="size-4" /> Admin dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/contact" className="flex items-center gap-2">
                    <Mail className="size-4" /> Contact
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <Headphones className="size-4" /> Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
