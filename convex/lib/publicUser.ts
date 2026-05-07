import type { Doc } from "../_generated/dataModel";

export type PublicUser = Omit<Doc<"users">, "passwordHash">;

export function publicUser(user: Doc<"users">): PublicUser {
  const { passwordHash: _unused, ...rest } = user;
  return rest;
}
