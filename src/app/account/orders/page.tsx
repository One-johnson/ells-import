import { Suspense } from "react";
import Link from "next/link";

import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { OrdersContent } from "./orders-content";

export const metadata = {
  title: "Orders",
};

export default function AccountOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">Orders you&apos;ve placed on this account.</p>
        <p className="mt-2 text-sm">
          <Link href="/account" className="text-foreground font-medium underline-offset-4 hover:underline">
            ← Back to account
          </Link>
        </p>
      </div>
      <Suspense fallback={<AccountPageSkeleton />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}
