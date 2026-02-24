"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

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

export type StoreSettings = {
  storeName: string;
  paymentPhone: string;
  paymentName: string;
  adminWhatsApp: string;
  defaultCountry: string;
  currency: string;
  freeShippingThresholdPesewas: number;
  shippingFlatRatePesewas: number;
  taxRatePercent: number;
  maintenanceMode: boolean;
};

const StoreSettingsContext = createContext<StoreSettings | null>(null);

export function useStoreSettings(): StoreSettings {
  const ctx = useContext(StoreSettingsContext);
  return ctx ?? DEFAULTS;
}

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const data = useQuery(api.settings.getPublic);
  const value: StoreSettings = data
    ? {
        storeName: data.storeName ?? DEFAULTS.storeName,
        paymentPhone: data.paymentPhone ?? DEFAULTS.paymentPhone,
        paymentName: data.paymentName ?? DEFAULTS.paymentName,
        adminWhatsApp: data.adminWhatsApp ?? DEFAULTS.adminWhatsApp,
        defaultCountry: data.defaultCountry ?? DEFAULTS.defaultCountry,
        currency: data.currency ?? DEFAULTS.currency,
        freeShippingThresholdPesewas:
          data.freeShippingThresholdPesewas ?? DEFAULTS.freeShippingThresholdPesewas,
        shippingFlatRatePesewas:
          data.shippingFlatRatePesewas ?? DEFAULTS.shippingFlatRatePesewas,
        taxRatePercent: data.taxRatePercent ?? DEFAULTS.taxRatePercent,
        maintenanceMode: data.maintenanceMode ?? DEFAULTS.maintenanceMode,
      }
    : DEFAULTS;

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
