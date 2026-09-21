import React, { useMemo } from "react";
import { getGenerator } from "./sketch";
import { RoughShape } from "./RoughShape";
import { theme } from "../theme";

export const Basketball: React.FC<{ size?: number }> = ({ size = 90 }) => {
  const shapes = useMemo(() => {
    const gen = getGenerator();
    const opts = {
      stroke: theme.colors.ink,
      strokeWidth: 2.6,
      roughness: 1.7,
      bowing: 1.4,
    };
    const r = 50;
    const cx = 50;
    const cy = 50;
    const ball = gen.circle(cx, cy, r * 2, {
      ...opts,
      fill: theme.colors.accentSoft,
      fillStyle: "solid",
      seed: 21,
    });
    const seamV = gen.line(cx, cy - r, cx, cy + r, { ...opts, strokeWidth: 2, seed: 22 });
    const seamH = gen.line(cx - r, cy, cx + r, cy, { ...opts, strokeWidth: 2, seed: 23 });
    const seamCurveL = gen.path(`M${cx},${cy - r} C${cx - 34},${cy - 20} ${cx - 34},${cy + 20} ${cx},${cy + r}`, {
      ...opts,
      strokeWidth: 2,
      seed: 24,
    });
    const seamCurveR = gen.path(`M${cx},${cy - r} C${cx + 34},${cy - 20} ${cx + 34},${cy + 20} ${cx},${cy + r}`, {
      ...opts,
      strokeWidth: 2,
      seed: 25,
    });
    return { ball, seamV, seamH, seamCurveL, seamCurveR };
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <RoughShape drawable={shapes.ball} />
      <RoughShape drawable={shapes.seamV} />
      <RoughShape drawable={shapes.seamH} />
      <RoughShape drawable={shapes.seamCurveL} />
      <RoughShape drawable={shapes.seamCurveR} />
    </svg>
  );
};
