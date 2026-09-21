import React from "react";
import { theme } from "../theme";

/**
 * Ivory paper-texture background made purely from CSS/SVG (no image asset
 * exists yet). Subtle grain + a faint edge vignette so it reads as paper,
 * not a flat rectangle.
 */
export const PaperBackground: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: theme.colors.paper,
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <filter id="paperGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.16  0 0 0 0 0.15  0 0 0 0.035 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paperGrain)" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: `inset 0 0 220px ${theme.colors.paperShadow}`,
        }}
      />
    </div>
  );
};
