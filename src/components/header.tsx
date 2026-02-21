"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NotificationsSheet } from "@/components/notifications-sheet";
import {
  Menu,
  ShoppingCart,
  User,
  LogOut,
  Package,
  UserCircle,
  Home,
  ShoppingBag,
  Tags,
  Heart,
  Bell,
  Search,
  Info,
  Mail,
  Headphones,
  LayoutDashboard,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/about", label: "About Us", icon: Info },
] as const;

const sheetExtraLinks = [
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

const sheetHelpLinks = [
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/support", label: "Support", icon: Headphones },
] as const;

export function Header() {
  const router = useRouter();
  const { sessionToken, setSessionToken } = useAuth();
  const user = useQuery(api.users.getMe, sessionToken ? { sessionToken } : "skip");
  const logout = useMutation(api.users.logout);
  const cart = useQuery(api.carts.get, sessionToken ? { sessionToken } : "skip");
  const wishlist = useQuery(api.wishlists.get, sessionToken ? { sessionToken } : "skip");
  const notificationsList = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );
  const cartCount = cart?.items?.length ?? 0;
  const wishlistCount = wishlist?.productIds?.length ?? 0;
  const unreadCount = (notificationsList?.items ?? []).filter((n) => !n.read).length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsSheetOpen, setNotificationsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function handleSignOut() {
    if (!sessionToken) return;
    await logout({ sessionToken });
    setSessionToken(null);
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/shop?q=${encodeURIComponent(q)}`);
    else router.push("/shop");
  }

  const isLoggedIn = !!user;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-8xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          {/* Left: hamburger (mobile) + logo + desktop nav */}
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-6">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                >
                  <Menu className="size-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 sm:max-w-[85vw]">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle className="flex items-center gap-2 text-left font-semibold">
                    <Image
                      src="/logo-source.png"
                      alt=""
                      width={100}
                      height={100}
                      className="h-16 w-auto object-contain"
                    />
                    Ell&apos;s Import
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-4">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="size-5 shrink-0" />
                      {label}
                    </Link>
                  ))}
                  {sheetExtraLinks.map(({ href, label, icon: Icon }) => {
                    const count =
                      href === "/cart" ? cartCount : href === "/wishlist" ? wishlistCount : href === "/notifications" && isLoggedIn ? unreadCount : 0;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon className="size-5 shrink-0" />
                        {label}
                        {count > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5c4033] dark:bg-[#8b6914] px-1.5 text-xs font-medium text-white">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  {sheetHelpLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="size-5 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image
                src="/logo-source.png"
                alt="Ell's Import"
                width={120}
                height={120}
                className="h-14 w-auto object-contain"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex md:items-center md:gap-6">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: search bar (desktop) */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 max-w-md md:flex md:items-center md:justify-center"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-muted/50 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </form>

          {/* Right: cart, wishlist, notifications (all for any logged-in user including admin), theme, user */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/cart"
              aria-label={cartCount > 0 ? `Cart (${cartCount} ${cartCount === 1 ? "product" : "products"})` : "Cart"}
              className="relative flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5c4033] dark:bg-[#8b6914] text-[10px] font-medium text-white px-1">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/wishlist"
              aria-label={wishlistCount > 0 ? `Wishlist (${wishlistCount} items)` : "Wishlist"}
              className="relative flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5c4033] dark:bg-[#8b6914] text-[10px] font-medium text-white px-1">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>
            {/* Notifications: desktop = Sheet, mobile = Link; shown for any logged-in user (including admin) */}
            {isLoggedIn ? (
              <>
                <div className="hidden md:block relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsSheetOpen(true)}
                    aria-label="Notifications"
                    className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground relative"
                  >
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5c4033] dark:bg-[#8b6914] text-[10px] font-medium text-white px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
                <Link
                  href="/notifications"
                  aria-label="Notifications"
                  className="relative flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                >
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5c4033] dark:bg-[#8b6914] text-[10px] font-medium text-white px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                <NotificationsSheet
                  open={notificationsSheetOpen}
                  onOpenChange={setNotificationsSheetOpen}
                />
              </>
            ) : (
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell className="size-5" />
              </Link>
            )}
            <ThemeToggle />
            {/* User profile menu (far right) */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="User menu"
                    className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground ring-2 ring-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt=""
                        width={40}
                        height={40}
                        className="size-8 rounded-full object-cover"
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
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <LayoutDashboard className="size-4" /> Admin dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
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
            ) : (
              <Link
                href="/sign-in"
                aria-label="Sign in"
                className="ml-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <User className="size-5" />
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
