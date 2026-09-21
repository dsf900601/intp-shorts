import React, { useMemo } from "react";
import { getGenerator } from "./sketch";
import { RoughShape } from "./RoughShape";
import { theme } from "../theme";

/** A short, hand-drawn downward arrow used to connect the analysis list. */
export const Arrow: React.FC<{ width?: number; height?: number; seed?: number }> = ({
  width = 40,
  height = 56,
  seed = 51,
}) => {
  const shapes = useMemo(() => {
    const gen = getGenerator();
    const opts = {
      stroke: theme.colors.inkSoft,
      strokeWidth: 3,
      roughness: 1.8,
      bowing: 1.6,
    };
    const shaft = gen.line(20, 4, 20, 44, { ...opts, seed });
    const headL = gen.line(20, 44, 8, 30, { ...opts, seed: seed + 1 });
    const headR = gen.line(20, 44, 32, 30, { ...opts, seed: seed + 2 });
    return { shaft, headL, headR };
  }, [seed]);

  return (
    <svg width={width} height={height} viewBox="0 0 40 56" style={{ display: "block", overflow: "visible" }}>
      <RoughShape drawable={shapes.shaft} />
      <RoughShape drawable={shapes.headL} />
      <RoughShape drawable={shapes.headR} />
    </svg>
  );
};
