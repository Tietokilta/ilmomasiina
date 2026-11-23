const EMAIL = /^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/;

/**
 * Turns what an admin typed as an external signup address into a safe link target, or null if it isn't one.
 * Accepts web addresses (a missing https:// is added) and email addresses (opened as mailto:).
 */
export default function signupLinkHref(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (EMAIL.test(text)) return `mailto:${text}`;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}
