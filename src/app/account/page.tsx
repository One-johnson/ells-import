"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Monitor, Moon, Share2, Sun, UserPlus } from "lucide-react";
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
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { userInitials } from "@/lib/user-display";
import { useAuth } from "@/providers/auth-provider";

const DEFAULT_STORE_NAME = "Ells Import";

export default function AccountPage() {
  const { isLoading, isAuthenticated, user, isAdmin, logout } = useAuth();
  const settings = useQuery(api.settings.storefrontSettings);
  const { theme, setTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [shareOrigin, setShareOrigin] = useState("");
  const router = useRouter();

  const currentTheme = (theme ?? "system") as "light" | "dark" | "system";
  const storeName = settings?.storeName?.trim() || DEFAULT_STORE_NAME;

  useEffect(() => {
    setShareOrigin(window.location.origin);
  }, []);

  const shareUrl = shareOrigin ? `${shareOrigin}/` : "";
  const shareMessage = useMemo(() => {
    if (!shareUrl) {
      return `Share the joy — ${storeName}`;
    }
    return `Share the joy — ${storeName}: ${shareUrl}`;
  }, [shareUrl, storeName]);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Account";
  const avatarFallback = user ? userInitials(user.name, user.email) : "?";

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/account")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  async function copyShareLink() {
    if (!shareUrl) {
      toast.error("Could not copy — try again in a moment.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  async function nativeShare() {
    if (!shareUrl || typeof navigator === "undefined" || !navigator.share) {
      return;
    }
    try {
      await navigator.share({
        title: `Share the joy · ${storeName}`,
        text: shareMessage,
        url: shareUrl,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return;
      }
      await copyShareLink();
    }
  }

  if (isLoading || !isAuthenticated || !user) {
    return <AccountPageSkeleton />;
  }

  return (
    <div className="from-muted/30 via-background to-background mx-auto max-w-lg space-y-8 bg-gradient-to-b px-4 pb-12 pt-6 md:rounded-xl md:py-10">
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

      <header className="flex flex-col items-center text-center">
        <Avatar className="border-background size-24 border-4 shadow-xl ring-4 ring-muted/60">
          {user.image ? (
            <AvatarImage src={user.image} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback className="text-lg font-semibold">{avatarFallback}</AvatarFallback>
        </Avatar>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{displayName}</h1>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{user.email}</p>
        <Badge variant={isAdmin ? "default" : "outline"} className="mt-3">
          {isAdmin ? "Admin" : "Customer"}
        </Badge>
      </header>

      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="relative w-full cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-blue-900 p-5 text-left text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-offset-background"
            aria-labelledby="invite-heading"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="bg-white/15 flex size-14 shrink-0 items-center justify-center rounded-2xl backdrop-blur-sm">
                <UserPlus className="size-7 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id="invite-heading" className="text-lg font-semibold tracking-tight">
                  Invite friends
                </h2>
                <p className="text-sm leading-relaxed text-blue-100">
                  Share the joy — tap to spread the word about {storeName}.
                </p>
              </div>
            </div>
          </button>
        </DrawerTrigger>

        <DrawerContent className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Share the joy</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Copy the message or use your device&apos;s share sheet when available.
            </DrawerDescription>
          </DrawerHeader>
          <div className="text-muted-foreground px-4 pb-2 text-sm leading-relaxed">
            <p className="bg-muted/60 border-border rounded-xl border p-4 font-medium text-foreground whitespace-pre-wrap">
              {shareMessage}
            </p>
          </div>
          <DrawerFooter className="gap-2 pt-2">
            <Button type="button" className="w-full gap-2 sm:w-auto" onClick={() => void copyShareLink()}>
              Copy message
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => void nativeShare()}>
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

      <Card id="appearance" className="border-muted/80 shadow-sm">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the site looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
            <Button
              type="button"
              variant={currentTheme === "light" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" aria-hidden />
              Light
            </Button>
            <Button
              type="button"
              variant={currentTheme === "dark" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" aria-hidden />
              Dark
            </Button>
            <Button
              type="button"
              variant={currentTheme === "system" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setTheme("system")}
            >
              <Monitor className="size-4" aria-hidden />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/account/orders">Orders</Link>
        </Button>
        {isAdmin && (
          <Button asChild>
            <Link href="/admin">Open admin</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setLogoutOpen(true)}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
