import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const useLineReveal = (index: number, delayPerLine: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startFrame = index * delayPerLine;
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200, mass: 0.6, stiffness: 120 },
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * 22}px)`,
  };
};

export const SceneText: React.FC<{
  lines: string[];
  fontSize?: number;
  delayPerLine?: number;
  color?: string;
  align?: "left" | "center";
  fontWeight?: number;
  style?: React.CSSProperties;
}> = ({
  lines,
  fontSize = 58,
  delayPerLine = 8,
  color = theme.colors.ink,
  align = "center",
  fontWeight = 700,
  style,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: 6,
        ...style,
      }}
    >
      {lines.map((line, i) => {
        const reveal = useLineReveal(i, delayPerLine);
        return (
          <div
            key={i}
            style={{
              fontFamily: theme.font.family,
              fontSize,
              fontWeight,
              color,
              textAlign: align,
              lineHeight: 1.32,
              opacity: reveal.opacity,
              transform: reveal.transform,
              whiteSpace: "pre-wrap",
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
