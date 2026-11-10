import { useRef, type PointerEvent } from 'react';

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;

/** Long press that does not fire while scrolling. `consumed()` tells the click handler to ignore the release. */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          navigator.vibrate?.(15);
          onLongPress();
        }, HOLD_MS);
      },
      onPointerMove: (e: PointerEvent) => {
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    },
    consumed: () => {
      const was = fired.current;
      fired.current = false;
      return was;
    },
  };
}
