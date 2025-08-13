import React, { useEffect, useState } from "react";

/**
 * Overlay that draws safe margins within the board.
 * @param {{targetRef: React.RefObject<HTMLElement>, inset?: number}} props
 */
export default function SafeMarginOverlay({ targetRef, inset = 0.05 }) {
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const update = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [targetRef]);

  const xInset = dims.width * inset;
  const yInset = dims.height * inset;

  return (
    <div data-export-exclude className="pointer-events-none absolute inset-0">
      <div
        className="absolute border-2 border-red-500/40"
        style={{ top: yInset, left: xInset, right: xInset, bottom: yInset }}
      />
    </div>
  );
}
