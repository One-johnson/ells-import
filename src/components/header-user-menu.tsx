"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, User, Monitor, Shield, Package, Heart } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userInitials } from "@/lib/user-display";
import { useAuth } from "@/providers/auth-provider";
import type { PublicUser } from "@convex/lib/publicUser";

type HeaderUserMenuProps = {
  user: PublicUser;
  isAdmin: boolean;
};

export function HeaderUserMenu({ user, isAdmin }: HeaderUserMenuProps) {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fallback = userInitials(user.name, user.email);
  const currentTheme = (theme ?? "system") as "light" | "dark" | "system";
  const accountAriaLabel = `Account (${user.name || user.email})`;

  const renderAvatar = () => (
    <Avatar className="size-8">
      {user.image ? (
        <AvatarImage src={user.image} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
    </Avatar>
  );

  return (
    <>
      <AlertDialog
        open={logoutOpen}
        onOpenChange={(o) => {
          setLogoutOpen(o);
        }}
      >
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

      <Button
        asChild
        variant="ghost"
        size="icon"
        className="relative size-9 shrink-0 rounded-full p-0 md:hidden"
      >
        <Link href="/account" aria-label={accountAriaLabel}>
          {renderAvatar()}
        </Link>
      </Button>

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-9 shrink-0 rounded-full p-0 hidden md:inline-flex"
            aria-label={accountAriaLabel}
          >
            {renderAvatar()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || "Account"}</p>
              <p className="text-muted-foreground truncate text-xs leading-none">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/wishlist" onClick={() => setDropdownOpen(false)} className="flex cursor-pointer">
              <Heart className="mr-2 size-4" />
              Wishlist
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account" onClick={() => setDropdownOpen(false)} className="flex cursor-pointer">
              <User className="mr-2 size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/orders" onClick={() => setDropdownOpen(false)} className="flex cursor-pointer">
              <Package className="mr-2 size-4" />
              Orders
            </Link>
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex cursor-pointer">
                <Shield className="mr-2 size-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentTheme}
            onValueChange={(v) => setTheme(v)}
          >
            <DropdownMenuRadioItem value="light" className="pl-2">
              <Sun className="text-muted-foreground mr-2 size-4" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" className="pl-2">
              <Moon className="text-muted-foreground mr-2 size-4" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" className="pl-2">
              <Monitor className="text-muted-foreground mr-2 size-4" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setDropdownOpen(false);
              setLogoutOpen(true);
            }}
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
