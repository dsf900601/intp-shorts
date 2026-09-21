import rough from "roughjs/bin/rough";
import type { Drawable } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";

// A single shared, seeded generator so every hand-drawn shape renders
// identically on every frame (no per-frame re-randomization / flicker).
let generator: RoughGenerator | null = null;
export const getGenerator = (): RoughGenerator => {
  if (!generator) {
    generator = rough.generator();
  }
  return generator;
};

export interface RoughPathData {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
}

/** Converts a roughjs Drawable into plain SVG <path> props we can render in React. */
export const drawableToPaths = (drawable: Drawable): RoughPathData[] => {
  const gen = getGenerator();
  const paths = gen.toPaths(drawable);
  return paths.map((p) => ({
    d: p.d,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    fill: p.fill === "none" ? null : p.fill,
  }));
};
