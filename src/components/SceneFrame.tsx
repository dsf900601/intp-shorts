import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { PaperBackground } from "./PaperBackground";
import { theme } from "../theme";

const TRANSITION = 12; // frames of gentle cross-fade at each scene boundary

/**
 * Shared per-scene wrapper: paper background, Instagram safe-zone padding,
 * a soft fade at the in/out edges so cuts between scenes never feel
 * abrupt, and a 3-region vertical layout (label/lead-in, character +
 * situation art, key sentence) sized roughly 18/52/30 of the safe area so
 * the frame reads as dense as the feed instead of mostly empty paper.
 */
export const SceneFrame: React.FC<{
  durationInFrames: number;
  top?: React.ReactNode;
  middle?: React.ReactNode;
  bottom?: React.ReactNode;
  /** Escape hatch for scenes (Scene 4) that shouldn't use the 3-region split. */
  children?: React.ReactNode;
}> = ({ durationInFrames, top, middle, bottom, children }) => {
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
        }}
      >
        {children ? (
          children
        ) : (
          <>
            <div
              style={{
                flexBasis: `${theme.regions.top}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {top}
            </div>
            <div
              style={{
                flexBasis: `${theme.regions.middle}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {middle}
            </div>
            <div
              style={{
                flexBasis: `${theme.regions.bottom}%`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
            >
              {bottom}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
