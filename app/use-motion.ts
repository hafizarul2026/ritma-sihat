import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function useAnimatedNumber(target: number, duration = 700, enabled = true) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    let start: number | null = null;
    let frame = 0;
    const ease = (progress: number) => 1 - Math.pow(1 - progress, 3);

    const tick = (now: number) => {
      if (start == null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * ease(progress);
      setValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);

  return value;
}

export function usePointerWash(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    node.classList.add("pointer-wash");
    const onMove = (event: PointerEvent) => {
      node.style.setProperty("--mx", event.clientX + "px");
      node.style.setProperty("--my", event.clientY + "px");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      node.classList.remove("pointer-wash");
    };
  }, [enabled]);

  return ref;
}
