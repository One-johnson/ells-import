import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicInvoicePdfContent } from "@/components/account/order-invoice-pdf";
import { AccountPageSkeleton } from "@/components/account/account-page-skeleton";

export const metadata: Metadata = {
  title: "Invoice",
};

export default function PublicInvoicePage() {
  return (
    <Suspense fallback={<AccountPageSkeleton />}>
      <PublicInvoicePdfContent />
    </Suspense>
  );
}

