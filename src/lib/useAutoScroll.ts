import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SPEED = 1;
const MAX_SPEED = 10;
const DEFAULT_SPEED = 4;
const PIXELS_PER_TICK_AT_SPEED_1 = 0.4;
const TICK_MS = 30;

export function useAutoScroll(containerRef: React.RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTop += speed * PIXELS_PER_TICK_AT_SPEED_1;

      // chegou ao fim: para sozinho
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setPlaying(false);
      }
    }, TICK_MS);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [playing, speed, containerRef]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const increaseSpeed = useCallback(
    () => setSpeed((s) => Math.min(MAX_SPEED, s + 1)),
    []
  );
  const decreaseSpeed = useCallback(
    () => setSpeed((s) => Math.max(MIN_SPEED, s - 1)),
    []
  );

  return { playing, speed, toggle, increaseSpeed, decreaseSpeed };
}
