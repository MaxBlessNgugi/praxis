import { useEffect, useState } from 'react';

/**
 * Whether the viewport is at most `maxPx` wide, tracked by the same media query CSS would use —
 * so the shell's breakpoints and the stylesheet's can never disagree about what "narrow" is.
 *
 * Created for §8 of the frontend-quality pass: the sidebar's collapsed rail existed but nothing
 * switched it on, so a phone showed a 288px navigation over a 200px sliver of page. SSR-safe and
 * cheap: one `matchMedia`, subscribed once.
 */
export function useViewportMax(maxPx: number): boolean {
  // `window.matchMedia` with a static string per call site; the query only changes if a caller
  // passes a different width between renders, which none does.
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(`(max-width: ${maxPx}px)`).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxPx}px)`);
    const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches);
    // `addEventListener` is the modern subscription; Safari below 14 also supported it on MQL.
    query.addEventListener('change', onChange);
    setNarrow(query.matches);
    return () => query.removeEventListener('change', onChange);
  }, [maxPx]);

  return narrow;
}
