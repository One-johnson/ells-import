"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Copy, Monitor, Moon, Package, Pencil, Share2, Sun, UserPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { AccountInstallAppCard } from "@/components/account-install-app-card";
import { AccountProfileEditDrawer } from "@/components/account/account-profile-edit-drawer";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { useUserAvatarUrl } from "@/hooks/use-user-avatar-url";
import { isPwaInstallBannerDismissed } from "@/lib/pwa-install";
import { SITE_ICON_192_CACHED } from "@/lib/site-icons";
import { getPublicSiteUrl } from "@/lib/site-url";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const DEFAULT_STORE_NAME = "Ells Import";

function AccountSectionLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      className="text-muted-foreground scroll-mt-6 text-xs font-semibold tracking-wide uppercase"
    >
      {children}
    </p>
  );
}

export default function AccountPage() {
  const { isLoading, isAuthenticated, user, isAdmin, logout, sessionToken } = useAuth();
  const settings = useQuery(api.settings.storefrontSettings);
  const { theme, setTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [installDismissFootnote, setInstallDismissFootnote] = useState(false);
  const router = useRouter();

  const currentTheme = (theme ?? "system") as "light" | "dark" | "system";
  const storeName = settings?.storeName?.trim() || DEFAULT_STORE_NAME;

  useEffect(() => {
    queueMicrotask(() => setInstallDismissFootnote(isPwaInstallBannerDismissed()));
  }, []);

  const inviteShopUrl = useMemo(() => getPublicSiteUrl(), []);

  const inviteMessage = useMemo(
    () =>
      `I've been using ${storeName} for my shopping. It's easy and safe.\n\nGet started here: ${inviteShopUrl}`,
    [inviteShopUrl, storeName],
  );

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Account";
  const avatarFallback = user ? userInitials(user.name, user.email) : "?";
  const avatarSrc = useUserAvatarUrl(user);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/account")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  async function copyInviteMessage() {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  async function nativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      return;
    }
    try {
      await navigator.share({
        title: `Invite · ${storeName}`,
        text: inviteMessage,
        url: inviteShopUrl,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return;
      }
      await copyInviteMessage();
    }
  }

  if (isLoading || !isAuthenticated || !user) {
    return <AccountPageSkeleton />;
  }

  const installFootnote = installDismissFootnote
    ? "If you dismissed the install reminder on another page, you can still add the app here."
    : undefined;

  return (
    <div className="from-muted/30 via-background to-background mx-auto w-full max-w-lg space-y-6 bg-gradient-to-b px-4 pb-12 pt-6 md:max-w-3xl md:space-y-8 md:rounded-xl md:px-8 md:py-10 lg:max-w-6xl lg:px-10 xl:max-w-7xl">
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account and saved cart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void logout()}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sessionToken ? (
        <AccountProfileEditDrawer
          user={user}
          sessionToken={sessionToken}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          showTrigger={false}
        />
      ) : null}

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
        <aside className="space-y-3 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <AccountSectionLabel id="account-heading">Account</AccountSectionLabel>
          <div className="flex flex-col items-center lg:items-stretch">
            <button
              type="button"
              className="group flex w-full max-w-sm cursor-pointer flex-col items-center rounded-2xl px-4 py-2 text-center outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:max-w-none lg:flex-row lg:items-center lg:gap-6 lg:border lg:border-border/80 lg:bg-card/40 lg:px-6 lg:py-6 lg:text-left"
              aria-label="Edit profile — photo and display name"
              onClick={() => setProfileOpen(true)}
            >
              <Avatar className="border-background size-24 shrink-0 border-4 shadow-xl ring-4 ring-muted/60 transition group-hover:ring-muted/80 lg:size-28">
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback className="text-lg font-semibold">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col items-center lg:items-start">
                <span className="mt-5 flex items-center gap-2 lg:mt-0">
                  <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{displayName}</h1>
                  <Pencil
                    className="text-muted-foreground size-4 shrink-0 opacity-60 transition group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm lg:max-w-none">{user.email}</p>
                <Badge variant={isAdmin ? "default" : "outline"} className="mt-3">
                  {isAdmin ? "Admin" : "Customer"}
                </Badge>
                <p className="text-muted-foreground mt-2 text-xs lg:hidden">Tap above to edit your photo and name</p>
                <p className="text-muted-foreground mt-2 hidden text-xs lg:block">
                  Click your profile to edit photo and display name.
                </p>
              </div>
            </button>
          </div>
        </aside>

        <div className="mt-8 space-y-6 lg:col-span-8 lg:mt-0 lg:space-y-8">
          <section aria-labelledby="shopping-heading" className="space-y-3">
        <AccountSectionLabel id="shopping-heading">Shopping</AccountSectionLabel>
        <Card id="orders" className="border-primary/25 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="bg-primary/12 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Package className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg">Your orders</CardTitle>
                <CardDescription>Track deliveries, invoices, and order history.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button className="w-full" asChild>
              <Link href="/account/orders">View orders</Link>
            </Button>
          </CardContent>
        </Card>
          </section>

          <section aria-labelledby="sharing-heading" className="space-y-3">
        <AccountSectionLabel id="sharing-heading">Sharing</AccountSectionLabel>
        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              id="invite-friends"
              className="relative w-full cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-blue-900 p-5 text-left text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 motion-reduce:transition-none motion-reduce:hover:brightness-100 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-offset-background"
              aria-labelledby="invite-heading"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10 blur-2xl motion-reduce:blur-none" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="bg-white/15 flex size-14 shrink-0 items-center justify-center rounded-2xl backdrop-blur-sm">
                  <UserPlus className="size-7 text-white" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 id="invite-heading" className="text-lg font-semibold tracking-tight">
                    Invite friends
                  </h3>
                  <p className="text-sm leading-relaxed text-blue-100">
                    Share the joy — tap to spread the word about {storeName}.
                  </p>
                </div>
              </div>
            </button>
          </DrawerTrigger>

          <DrawerContent className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <DrawerHeader className="text-center sm:text-left">
              <DrawerTitle>Invite Friends</DrawerTitle>
              <DrawerDescription className="text-muted-foreground">
                Share a quick note with friends — copy the message or use your device&apos;s share sheet.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col items-center gap-5 px-4 pb-2">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- static app icon; small fixed size */}
                <img
                  src={SITE_ICON_192_CACHED}
                  alt=""
                  width={72}
                  height={72}
                  className="border-border size-[4.5rem] rounded-2xl border object-cover shadow-md"
                />
                <p className="text-foreground text-lg font-semibold tracking-tight">{storeName}</p>
              </div>
              <div className="border-border bg-card text-card-foreground relative w-full max-w-md rounded-xl border p-4 pr-14 text-left text-sm leading-relaxed shadow-sm">
                <p className="text-foreground whitespace-pre-wrap">{inviteMessage}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-3 right-3 shrink-0"
                  aria-label="Copy invite message"
                  onClick={() => void copyInviteMessage()}
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            <DrawerFooter className="gap-2 pt-2">
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <Button
                  type="button"
                  className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                  onClick={() => void nativeShare()}
                >
                  <Share2 className="size-4" aria-hidden />
                  Share via…
                </Button>
              ) : null}
              <DrawerClose asChild>
                <Button type="button" variant="ghost" className="w-full sm:w-auto">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
          </section>

          <section aria-labelledby="app-display-heading" className="space-y-3">
        <AccountSectionLabel id="app-display-heading">App &amp; display</AccountSectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Card id="appearance" className="border-muted/80 shadow-sm md:flex md:flex-col">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>How the site looks on this device.</CardDescription>
            </CardHeader>
            <CardContent className="md:flex-1 md:pt-0">
              <div
                className="bg-muted/80 flex rounded-lg border p-1"
                role="radiogroup"
                aria-label="Theme"
              >
                {(
                  [
                    { value: "light" as const, label: "Light", icon: Sun },
                    { value: "dark" as const, label: "Dark", icon: Moon },
                    { value: "system" as const, label: "System", icon: Monitor },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={currentTheme === value}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2.5 text-xs font-medium transition-colors sm:flex-row sm:text-sm",
                      currentTheme === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setTheme(value)}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                {currentTheme === "system"
                  ? "Matches your device light/dark setting."
                  : currentTheme === "dark"
                    ? "Dark theme is always on for this site."
                    : "Light theme is always on for this site."}
              </p>
            </CardContent>
          </Card>

          <AccountInstallAppCard id="install-app" footnote={installFootnote} />
        </div>
          </section>

          <section
            id="more"
            aria-labelledby="account-more-heading"
            className="border-border space-y-3 border-t pt-6"
          >
        <h2 id="account-more-heading" className="sr-only">
          More account actions
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isAdmin ? (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/admin">Open admin</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive w-full border-destructive/40 sm:w-auto"
            onClick={() => setLogoutOpen(true)}
          >
            Sign out
          </Button>
        </div>
          </section>
        </div>
      </div>
    </div>
  );
}
