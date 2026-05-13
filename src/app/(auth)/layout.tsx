import { AuthPageBrandHeader } from "@/components/app-brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 flex min-h-0 flex-1 flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center">
        <AuthPageBrandHeader />
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
