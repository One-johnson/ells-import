"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";

/** Same URL as `SITE_ICON_192_PLAIN` in `@/lib/site-icons` (inlined so the client bundle never misses the export). */
export const APP_LOGO_SRC = "/icons/icon-192.png";

type AppBrandLogoImageProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function AppBrandLogoImage({ size = 40, className, priority }: AppBrandLogoImageProps) {
  return (
    <Image
      src={APP_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      priority={priority}
    />
  );
}

type AppBrandLogoLinkProps = Omit<AppBrandLogoImageProps, "className"> & {
  href?: string;
  /** Classes on the image */
  className?: string;
  /** Classes on the wrapping link */
  linkClassName?: string;
};

export function AppBrandLogoLink({
  href = "/",
  size = 40,
  className,
  linkClassName,
  priority,
}: AppBrandLogoLinkProps) {
  return (
    <Link href={href} aria-label="Home" className={cn("inline-flex shrink-0", linkClassName)}>
      <AppBrandLogoImage size={size} className={className} priority={priority} />
    </Link>
  );
}

/** Centered logo + optional store name for sign-in / sign-up layouts. */
export function AuthPageBrandHeader() {
  const storefront = useQuery(api.settings.storefrontSettings);
  const name = storefront?.storeName?.trim();

  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <AppBrandLogoLink size={80} />
      {name ? (
        <p className="text-foreground mt-4 text-lg font-semibold tracking-tight">{name}</p>
      ) : storefront === undefined ? (
        <div className="bg-muted mt-4 h-6 w-40 max-w-full animate-pulse rounded-md" aria-hidden />
      ) : null}
    </div>
  );
}
