import { useCallback, useRef, useState } from 'react';

/**
 * Copy-to-clipboard with a transient "copied" flag that auto-resets after
 * `resetMs`. Shared by the copy buttons that show a 2s confirmation (e.g.
 * CopyButton, SetupSteps' prompt field). Callers that need extra side effects
 * (BI, dataLayer) run them alongside `copy()`.
 */
export function useCopy(text: string, resetMs = 2000): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
    } catch {
      /* clipboard unavailable — leave state unchanged */
    }
  }, [text, resetMs]);

  return { copied, copy };
}
