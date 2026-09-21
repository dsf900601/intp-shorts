import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const EpisodeLabel: React.FC<{
  series: string;
  episode: string;
  small?: boolean;
}> = ({ series, episode, small }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: theme.font.family,
        fontSize: small ? theme.type.label : 40,
        color: theme.colors.inkSoft,
        letterSpacing: 1,
        borderBottom: `2px solid ${theme.colors.accent}`,
        paddingBottom: 6,
        opacity,
      }}
    >
      {series} #{episode}
    </div>
  );
};
