import type { AuthConfig } from "convex/server";

/** Session-based auth via sessions table; no JWT. Pass sessionToken to Convex. */
export default {
  providers: [],
} satisfies AuthConfig;
