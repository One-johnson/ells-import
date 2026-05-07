"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { publicRef } from "@/lib/public-ref";
import { useAuth } from "@/providers/auth-provider";

export default function AccountPage() {
  const { isLoading, isAuthenticated, user, isAdmin, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/account")}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return <AccountPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your profile and preferences.</p>
      </div>

      <Card id="profile">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Information associated with your sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Reference #</p>
            <p className="font-mono text-sm font-medium">{publicRef(user.publicCode)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          {user.name ? (
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
          ) : null}
          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <Badge variant={isAdmin ? "default" : "outline"} className="mt-0.5">
              {isAdmin ? "Admin" : "Customer"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card id="notifications">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Order updates and other alerts appear in the header bell.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <p>Order and system messages appear in the notification bell in the top bar when you are signed in.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/account/orders">Orders</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
        {isAdmin && (
          <Button asChild>
            <Link href="/admin">Open admin</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => void logout()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
