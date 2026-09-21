import React, { useMemo } from "react";
import { getGenerator } from "./sketch";
import { RoughShape } from "./RoughShape";
import { theme } from "../theme";

/** A simple, hand-drawn half basketball court — just enough to read as a court. */
export const Court: React.FC<{ width?: number }> = ({ width = 820 }) => {
  const height = width * 0.62;

  const shapes = useMemo(() => {
    const gen = getGenerator();
    const opts = {
      stroke: theme.colors.inkSoft,
      strokeWidth: 2.4,
      roughness: 1.6,
      bowing: 1.2,
    };
    const w = 800;
    const h = 496;
    const boundary = gen.rectangle(8, 8, w - 16, h - 16, { ...opts, seed: 31 });
    const key = gen.rectangle(w / 2 - 90, h - 130, 180, 130, { ...opts, seed: 32 });
    const arc = gen.arc(w / 2, h - 130, 180, 180, Math.PI, Math.PI * 2, false, {
      ...opts,
      seed: 33,
    });
    const centerLine = gen.line(8, h * 0.32, w - 8, h * 0.32, { ...opts, seed: 34 });
    return { boundary, key, arc, centerLine };
  }, []);

  return (
    <svg width={width} height={height} viewBox="0 0 800 496" style={{ display: "block", overflow: "visible" }}>
      <RoughShape drawable={shapes.boundary} />
      <RoughShape drawable={shapes.key} />
      <RoughShape drawable={shapes.arc} />
      <RoughShape drawable={shapes.centerLine} />
    </svg>
  );
};
