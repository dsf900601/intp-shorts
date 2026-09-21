import React from "react";
import type { Drawable } from "roughjs/bin/core";
import { drawableToPaths } from "./sketch";

/** Renders one or more roughjs Drawables as hand-drawn SVG paths. */
export const RoughShape: React.FC<{ drawable: Drawable | Drawable[] }> = ({
  drawable,
}) => {
  const drawables = Array.isArray(drawable) ? drawable : [drawable];
  return (
    <>
      {drawables.map((d, di) =>
        drawableToPaths(d).map((p, i) => (
          <path
            key={`${di}-${i}`}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill ?? "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </>
  );
};
