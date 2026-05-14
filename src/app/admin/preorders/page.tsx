import { AdminPreorderRounds } from "@/components/admin/admin-preorder-rounds";

export const metadata = {
  title: "Pre-order rounds",
};

export default function AdminPreordersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Pre-order rounds</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Monthly batches for China → Ghana pre-orders. Each round closes automatically at the end of the 28th (UTC).
        </p>
      </div>
      <AdminPreorderRounds />
    </div>
  );
}
