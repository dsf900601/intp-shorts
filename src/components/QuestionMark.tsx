import React from "react";
import { theme } from "../theme";

export const QuestionMark: React.FC<{
  size?: number;
  style?: React.CSSProperties;
}> = ({ size = 64, style }) => {
  return (
    <div
      style={{
        fontFamily: theme.font.family,
        fontSize: size,
        color: theme.colors.ink,
        lineHeight: 1,
        transform: "rotate(-4deg)",
        ...style,
      }}
    >
      ?
    </div>
  );
};
