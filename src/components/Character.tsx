import React from "react";
import { Img, staticFile } from "remotion";
import { theme } from "../theme";
import { CharacterPose } from "../content/types";

/**
 * The "인치디" mascot. This is an asset slot, not a drawing: real character
 * art lives at public/characters/<pose>.png and matches the existing
 * Instagram feed's illustration style. We deliberately do not draw a
 * placeholder person here - when the PNG for a pose hasn't been dropped in
 * yet, we render a labeled empty slot instead so the rest of the scene can
 * still be reviewed.
 */
export const Character: React.FC<{
  pose: CharacterPose;
  available: boolean;
  width?: number;
}> = ({ pose, available, width = 460 }) => {
  const height = width * 1.15;

  if (!available) {
    return (
      <div
        style={{
          width,
          height,
          border: `3px dashed ${theme.colors.inkSoft}`,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.55,
        }}
      >
        <span
          style={{
            fontFamily: theme.font.family,
            fontSize: 30,
            color: theme.colors.inkSoft,
            textAlign: "center",
          }}
        >
          캐릭터
          <br />
          {pose}
        </span>
      </div>
    );
  }

  return (
    <Img
      src={staticFile(`characters/${pose}.png`)}
      style={{ width, height: "auto", display: "block" }}
    />
  );
};
