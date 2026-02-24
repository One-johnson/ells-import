"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Store,
  MessageCircle,
  Truck,
  ShieldAlert,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";

const DEFAULTS = {
  storeName: "Ell's Import",
  paymentPhone: "0553301044",
  paymentName: "Prince Johnson",
  adminWhatsApp: "233553301044",
  defaultCountry: "Ghana",
  currency: "GHS",
  freeShippingThresholdPesewas: 50000,
  shippingFlatRatePesewas: 2000,
  taxRatePercent: 0,
  maintenanceMode: false,
} as const;

type FormState = {
  storeName: string;
  paymentPhone: string;
  paymentName: string;
  adminWhatsApp: string;
  defaultCountry: string;
  currency: string;
  freeShippingThresholdGhs: string;
  shippingFlatRateGhs: string;
  taxRatePercent: string;
  maintenanceMode: boolean;
};

function toFormState(doc: {
  storeName?: string | null;
  paymentPhone?: string | null;
  paymentName?: string | null;
  adminWhatsApp?: string | null;
  defaultCountry?: string | null;
  currency?: string | null;
  freeShippingThresholdPesewas?: number | null;
  shippingFlatRatePesewas?: number | null;
  taxRatePercent?: number | null;
  maintenanceMode?: boolean | null;
} | null): FormState {
  if (!doc) {
    return {
      storeName: DEFAULTS.storeName,
      paymentPhone: DEFAULTS.paymentPhone,
      paymentName: DEFAULTS.paymentName,
      adminWhatsApp: DEFAULTS.adminWhatsApp,
      defaultCountry: DEFAULTS.defaultCountry,
      currency: DEFAULTS.currency,
      freeShippingThresholdGhs: String(DEFAULTS.freeShippingThresholdPesewas / 100),
      shippingFlatRateGhs: String(DEFAULTS.shippingFlatRatePesewas / 100),
      taxRatePercent: String(DEFAULTS.taxRatePercent),
      maintenanceMode: DEFAULTS.maintenanceMode,
    };
  }
  return {
    storeName: doc.storeName ?? DEFAULTS.storeName,
    paymentPhone: doc.paymentPhone ?? DEFAULTS.paymentPhone,
    paymentName: doc.paymentName ?? DEFAULTS.paymentName,
    adminWhatsApp: doc.adminWhatsApp ?? DEFAULTS.adminWhatsApp,
    defaultCountry: doc.defaultCountry ?? DEFAULTS.defaultCountry,
    currency: doc.currency ?? DEFAULTS.currency,
    freeShippingThresholdGhs: doc.freeShippingThresholdPesewas != null
      ? String(doc.freeShippingThresholdPesewas / 100)
      : String(DEFAULTS.freeShippingThresholdPesewas / 100),
    shippingFlatRateGhs: doc.shippingFlatRatePesewas != null
      ? String(doc.shippingFlatRatePesewas / 100)
      : String(DEFAULTS.shippingFlatRatePesewas / 100),
    taxRatePercent: doc.taxRatePercent != null
      ? String(doc.taxRatePercent)
      : String(DEFAULTS.taxRatePercent),
    maintenanceMode: doc.maintenanceMode ?? DEFAULTS.maintenanceMode,
  };
}

export default function AdminSettingsPage() {
  const { sessionToken } = useAuth();
  const settingsDoc = useQuery(
    api.settings.get,
    sessionToken ? { sessionToken } : "skip"
  );
  const updateSettings = useMutation(api.settings.update);

  const [form, setForm] = useState<FormState>(() => toFormState(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toFormState(settingsDoc ?? null));
  }, [settingsDoc]);

  const isLoading = sessionToken && settingsDoc === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;

    const freeShippingPesewas = Math.round(
      parseFloat(form.freeShippingThresholdGhs || "0") * 100
    );
    const shippingPesewas = Math.round(
      parseFloat(form.shippingFlatRateGhs || "0") * 100
    );
    const taxRate = parseFloat(form.taxRatePercent || "0");

    if (Number.isNaN(freeShippingPesewas) || freeShippingPesewas < 0) {
      toast.error("Free shipping threshold must be a valid number.");
      return;
    }
    if (Number.isNaN(shippingPesewas) || shippingPesewas < 0) {
      toast.error("Flat shipping rate must be a valid number.");
      return;
    }
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      toast.error("Tax rate must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        sessionToken,
        storeName: form.storeName || undefined,
        paymentPhone: form.paymentPhone || undefined,
        paymentName: form.paymentName || undefined,
        adminWhatsApp: form.adminWhatsApp || undefined,
        defaultCountry: form.defaultCountry || undefined,
        currency: form.currency || undefined,
        freeShippingThresholdPesewas: freeShippingPesewas,
        shippingFlatRatePesewas: shippingPesewas,
        taxRatePercent: taxRate,
        maintenanceMode: form.maintenanceMode,
      });
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Store details, payment info, shipping, tax, and maintenance mode.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Store details */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="size-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Store details</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Store name
              </label>
              <Input
                value={form.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                placeholder="e.g. Ell's Import"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Default country
              </label>
              <Input
                value={form.defaultCountry}
                onChange={(e) => updateField("defaultCountry", e.target.value)}
                placeholder="e.g. Ghana"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Currency
              </label>
              <Input
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
                placeholder="e.g. GHS"
              />
            </div>
          </div>
        </section>

        {/* Payment / WhatsApp */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="size-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              Payment &amp; WhatsApp
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Shown to customers for payment instructions and contact.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Payment phone (display)
              </label>
              <Input
                value={form.paymentPhone}
                onChange={(e) => updateField("paymentPhone", e.target.value)}
                placeholder="e.g. 0553301044"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Payment name
              </label>
              <Input
                value={form.paymentName}
                onChange={(e) => updateField("paymentName", e.target.value)}
                placeholder="Account holder name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium leading-none">
                Admin WhatsApp number
              </label>
              <Input
                value={form.adminWhatsApp}
                onChange={(e) => updateField("adminWhatsApp", e.target.value)}
                placeholder="e.g. 233553301044 (with country code)"
              />
            </div>
          </div>
        </section>

        {/* Shipping & tax */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="size-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              Shipping &amp; tax
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Amounts in main currency (e.g. GHS). Free shipping above threshold;
            otherwise flat rate is applied.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Free shipping above (e.g. GHS)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.freeShippingThresholdGhs}
                onChange={(e) =>
                  updateField("freeShippingThresholdGhs", e.target.value)
                }
                placeholder="500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Flat shipping rate (e.g. GHS)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.shippingFlatRateGhs}
                onChange={(e) =>
                  updateField("shippingFlatRateGhs", e.target.value)
                }
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Tax rate (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.taxRatePercent}
                onChange={(e) =>
                  updateField("taxRatePercent", e.target.value)
                }
                placeholder="0"
              />
            </div>
          </div>
        </section>

        {/* Maintenance mode */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="size-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              Maintenance mode
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="maintenanceMode"
              checked={form.maintenanceMode}
              onCheckedChange={(checked) =>
                updateField("maintenanceMode", checked === true)
              }
            />
            <label
              htmlFor="maintenanceMode"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Enable maintenance mode (storefront may show a maintenance message)
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save settings
              </>
            )}
          </Button>
          <Link
            href="/admin"
            className="text-sm font-medium text-[#5c4033] hover:underline dark:text-[#c9a227]"
          >
            Back to dashboard
          </Link>
        </div>
      </form>
    </div>
  );
}
