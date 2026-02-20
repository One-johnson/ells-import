import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Admin and store settings. Configure later.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Store details, shipping, taxes, and admin preferences will be available here.
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
