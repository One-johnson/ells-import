import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    // optional: add `src/app/offline/page.tsx` to customize
    // document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  // PWA uses webpack; Next 16 defaults to Turbopack for `dev` / `build` — use
  // `npm run dev` / `npm run build` (scripts pass `--webpack`) to avoid a conflict.
};

export default withPWA(nextConfig);
