import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const EpisodeLabel: React.FC<{ series: string; episode: string }> = ({
  series,
  episode,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: theme.font.family,
          fontSize: 28,
          color: theme.colors.inkSoft,
          letterSpacing: 1,
          borderBottom: `2px solid ${theme.colors.accent}`,
          paddingBottom: 6,
        }}
      >
        {series} #{episode}
      </div>
    </div>
  );
};
