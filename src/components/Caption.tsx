import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const useLineReveal = (index: number, delayPerLine: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - index * delayPerLine,
    fps,
    config: { damping: 200, mass: 0.6, stiffness: 120 },
  });
  return { opacity: progress, transform: `translateY(${(1 - progress) * 18}px)` };
};

/**
 * The subtitle layer. Sits over real illustration (not paper), so it needs
 * real contrast: ivory text + dark stroke + drop shadow, never the feed
 * image's own baked-in lettering. Anchored ~55-72% down the frame -
 * comfortably clear of Instagram's top/bottom chrome. A soft dark scrim
 * sits behind the text (the source art swings from near-black hoodies to
 * near-white poster paper, so stroke+shadow alone isn't always enough).
 */
export const Caption: React.FC<{ lines: string[]; emphasis?: boolean }> = ({
  lines,
  emphasis,
}) => {
  const fontSize = emphasis ? 76 : 60;
  return (
    <div
      style={{
        position: "absolute",
        left: theme.safeZone.side,
        right: theme.safeZone.side,
        top: "56%",
        transform: "translateY(-30%)",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "36px 24px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,14,10,0.62) 0%, rgba(18,14,10,0.4) 45%, rgba(18,14,10,0) 75%)",
          }}
        />
        {lines.map((line, i) => {
          const reveal = useLineReveal(i, 8);
          return (
            <div
              key={i}
              style={{
                position: "relative",
                fontFamily: theme.font.family,
                fontSize,
                fontWeight: 700,
                color: "#FFFDF7",
                textAlign: "center",
                lineHeight: 1.3,
                opacity: reveal.opacity,
                transform: reveal.transform,
                WebkitTextStroke: "1.4px rgba(30,24,16,0.55)",
                textShadow:
                  "0 2px 4px rgba(0,0,0,0.35), 0 0 2px rgba(0,0,0,0.7), 0 6px 18px rgba(0,0,0,0.25)",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};
