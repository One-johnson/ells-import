const KEY = "ells_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(KEY);
}
