import { useEffect, useRef } from 'react';

const ROLL_EASING = 'cubic-bezier(0.16, 0.84, 0.24, 1)';

// One vertical reel that spins from 0 up to `value`, doing `cycles` full 0–9
// turns first so it reads like an odometer settling into place.
function RollingDigit({
  value,
  cycles,
  durationMs,
}: {
  value: number;
  cycles: number;
  durationMs: number;
}) {
  const trackRef = useRef<HTMLSpanElement>(null);
  const landing = cycles * 10 + value; // row index we settle on
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.style.transition = 'none';
    el.style.transform = 'translateY(0)';
    if (reduce) {
      el.style.transform = `translateY(-${landing}em)`;
      return;
    }
    void el.offsetHeight; // commit the start position before transitioning
    const raf = requestAnimationFrame(() => {
      el.style.transition = `transform ${durationMs}ms ${ROLL_EASING}`;
      el.style.transform = `translateY(-${landing}em)`;
    });
    return () => cancelAnimationFrame(raf);
  }, [landing, durationMs]);
  return (
    <span className="hcf-hday-count-digit" aria-hidden="true">
      <span className="hcf-hday-count-track" ref={trackRef}>
        {Array.from({ length: landing + 1 }, (_, i) => (
          <span key={i} className="hcf-hday-count-cell">
            {i % 10}
          </span>
        ))}
      </span>
    </span>
  );
}

// The gallery count: shows a static zero-padded "00" until submissions land,
// then each digit rolls up into place (higher places settle last).
export function RollingCount({ value, minLength = 2 }: { value: number; minLength?: number }) {
  const digits = String(Math.max(0, value)).padStart(minLength, '0').split('').map(Number);
  const n = digits.length;
  return (
    <span className="hcf-hday-gallery-count" aria-label={String(Math.max(0, value))}>
      {digits.map((d, i) => {
        const place = n - 1 - i; // 0 = ones (rightmost)
        if (value <= 0) {
          // Static, pre-load state — no reels, just zeros.
          return (
            <span key={i} className="hcf-hday-count-digit" aria-hidden="true">
              <span className="hcf-hday-count-track">
                <span className="hcf-hday-count-cell">{d}</span>
              </span>
            </span>
          );
        }
        return (
          <RollingDigit
            key={`${value}-${i}`}
            value={d}
            cycles={2 + place}
            durationMs={1000 + place * 450}
          />
        );
      })}
    </span>
  );
}
