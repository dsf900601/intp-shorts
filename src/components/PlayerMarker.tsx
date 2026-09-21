import React, { useMemo } from "react";
import { getGenerator } from "./sketch";
import { RoughShape } from "./RoughShape";
import { theme } from "../theme";

/** A tiny rough-sketched dot standing in for another player on the court. */
export const PlayerMarker: React.FC<{ size?: number; highlight?: boolean }> = ({
  size = 34,
  highlight = false,
}) => {
  const shape = useMemo(() => {
    const gen = getGenerator();
    return gen.circle(50, 50, 70, {
      stroke: theme.colors.inkSoft,
      strokeWidth: 2.4,
      roughness: 1.8,
      bowing: 1.4,
      fill: highlight ? theme.colors.accent : theme.colors.paper,
      fillStyle: "solid",
      seed: 41,
    });
  }, [highlight]);

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <RoughShape drawable={shape} />
    </svg>
  );
};
