/** Digits only, suitable for https://wa.me/<digits> (include country code, no +). */
export function digitsOnlyForWaMe(input: string | null | undefined): string | null {
  if (!input?.trim()) {
    return null;
  }
  const d = input.replace(/\D/g, "");
  if (d.length < 10) {
    return null;
  }
  return d;
}

export function whatsappMeUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}
