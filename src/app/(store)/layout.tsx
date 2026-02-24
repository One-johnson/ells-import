import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StoreSettingsProvider } from "@/components/store-settings-provider";
import { MaintenanceGate } from "@/components/maintenance-gate";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreSettingsProvider>
      <MaintenanceGate>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </MaintenanceGate>
    </StoreSettingsProvider>
  );
}
