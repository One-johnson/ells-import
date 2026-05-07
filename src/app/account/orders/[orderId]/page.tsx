import { Suspense } from "react";
import Link from "next/link";

import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";
import { OrderDetailContent } from "./order-detail-content";

type PageProps = { params: Promise<{ orderId: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { orderId } = await params;
  return { title: "Order" };
}

export default function OrderDetailPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
      <p>
        <Link href="/account/orders" className="text-foreground text-sm font-medium underline-offset-4 hover:underline">
          ← Orders
        </Link>
      </p>
      <Suspense fallback={<AccountPageSkeleton />}>
        <OrderDetailContent />
      </Suspense>
    </div>
  );
}
