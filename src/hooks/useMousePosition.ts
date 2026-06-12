import { useRef, useCallback } from "react";
import { useMotionValue, MotionValue } from "framer-motion";

interface UseMousePositionReturn {
  ref: React.RefObject<HTMLElement>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  normalizedX: MotionValue<number>;
  normalizedY: MotionValue<number>;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

export function useMousePosition(): UseMousePositionReturn {
  const ref = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const normalizedX = useMotionValue(0);
  const normalizedY = useMotionValue(0);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const absX = e.clientX - rect.left;
      const absY = e.clientY - rect.top;

      mouseX.set(absX);
      mouseY.set(absY);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      normalizedX.set((absX - centerX) / centerX);
      normalizedY.set((absY - centerY) / centerY);
    },
    [mouseX, mouseY, normalizedX, normalizedY]
  );

  const onMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    normalizedX.set(0);
    normalizedY.set(0);
  }, [mouseX, mouseY, normalizedX, normalizedY]);

  return {
    ref,
    mouseX,
    mouseY,
    normalizedX,
    normalizedY,
    onMouseMove,
    onMouseLeave,
  };
}

export default useMousePosition;
