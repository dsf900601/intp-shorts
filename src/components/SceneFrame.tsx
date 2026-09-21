import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PaperBackground } from "./PaperBackground";
import { theme } from "../theme";

const TRANSITION = 12; // frames of gentle cross-fade at each scene boundary

/**
 * Shared per-scene wrapper: paper background, Instagram safe-zone padding,
 * and a soft fade at the in/out edges so cuts between scenes never feel
 * abrupt (per the "no hard cuts / no flashy transitions" design rule).
 */
export const SceneFrame: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, TRANSITION, durationInFrames - TRANSITION, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <PaperBackground />
      <div
        style={{
          position: "absolute",
          top: theme.safeZone.top,
          bottom: theme.safeZone.bottom,
          left: theme.safeZone.side,
          right: theme.safeZone.side,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        {children}
      </div>
    </div>
  );
};
