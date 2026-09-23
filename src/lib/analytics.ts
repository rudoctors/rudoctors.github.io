/** Lightweight outbound click + pageview hooks. Plausible/Umami optional. */
export function initAnalytics(): void {
  const track = (event: string, props?: Record<string, string | number>) => {
    const w = window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
      umami?: { track: (e: string, o?: Record<string, string | number>) => void };
    };
    try {
      w.plausible?.(event, props ? { props } : undefined);
      w.umami?.track(event, props);
    } catch {
      /* analytics optional */
    }
  };

  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.("a");
    if (!el) return;
    const href = el.getAttribute("href") || "";
    if (!href) return;
    if (/^(https?:)?\/\//i.test(href) && !href.includes("rudoctors.github.io")) {
      track("Outbound Click", { url: href.slice(0, 200) });
      if (/alteg\.io|appointment|calendar/i.test(href) || el.textContent?.includes("Записаться")) {
        track("Appointment Click", { url: href.slice(0, 200) });
      }
    }
  };

  document.addEventListener("click", onClick, { passive: true });
}
