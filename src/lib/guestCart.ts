export type GuestCartLine = { productId: string; quantity: number };

const KEY = "ells-import:guest-cart:v1";
const EVT = "ells-import:guest-cart:changed";

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function readGuestCart(): GuestCartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = safeParse(window.localStorage.getItem(KEY));
  if (!Array.isArray(raw)) return [];
  const out: GuestCartLine[] = [];
  for (const r of raw) {
    if (
      r &&
      typeof r === "object" &&
      "productId" in r &&
      "quantity" in r &&
      typeof (r as any).productId === "string" &&
      typeof (r as any).quantity === "number"
    ) {
      const q = Math.floor((r as any).quantity);
      if (q > 0) out.push({ productId: (r as any).productId, quantity: q });
    }
  }
  return out;
}

export function writeGuestCart(lines: GuestCartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVT));
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function addGuestCartItem(productId: string, quantity: number) {
  const q = Math.max(1, Math.floor(quantity));
  const cur = readGuestCart();
  const i = cur.findIndex((l) => l.productId === productId);
  const next = [...cur];
  if (i >= 0) {
    next[i] = { productId, quantity: next[i]!.quantity + q };
  } else {
    next.push({ productId, quantity: q });
  }
  writeGuestCart(next);
}

export function setGuestCartItemQuantity(productId: string, quantity: number) {
  const q = Math.floor(quantity);
  const cur = readGuestCart();
  const next = q < 1 ? cur.filter((l) => l.productId !== productId) : cur.map((l) => (l.productId === productId ? { productId, quantity: q } : l));
  writeGuestCart(next);
}

export function guestCartCount(lines?: GuestCartLine[]) {
  const rows = lines ?? readGuestCart();
  return rows.reduce((sum, l) => sum + l.quantity, 0);
}

export function subscribeGuestCart(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => onChange();
  window.addEventListener("storage", h);
  window.addEventListener(EVT, h);
  return () => {
    window.removeEventListener("storage", h);
    window.removeEventListener(EVT, h);
  };
}

