/** Client-side form anti-spam: honeypot + cooldown. No captcha. */

export function isHoneypotFilled(form: HTMLFormElement): boolean {
  const trap = form.querySelector<HTMLInputElement>('[name="website_trap"]');
  return Boolean(trap?.value?.trim());
}

export function cooldownRemainingMs(key: string, minMs = 60_000): number {
  try {
    const raw = sessionStorage.getItem(`form_cd:${key}`);
    if (!raw) return 0;
    const last = Number(raw);
    if (!Number.isFinite(last)) return 0;
    return Math.max(0, last + minMs - Date.now());
  } catch {
    return 0;
  }
}

export function markSubmitted(key: string): void {
  try {
    sessionStorage.setItem(`form_cd:${key}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function formatCooldown(ms: number): string {
  return `Подождите ${Math.ceil(ms / 1000)} сек. перед повторной отправкой.`;
}
