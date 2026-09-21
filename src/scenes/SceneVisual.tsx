import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../components/Character";
import { Basketball } from "../components/Basketball";
import { Court } from "../components/Court";
import { PlayerMarker } from "../components/PlayerMarker";
import { QuestionMark } from "../components/QuestionMark";
import { Arrow } from "../components/Arrow";
import { theme } from "../theme";
import { SceneVisual as SceneVisualData } from "../content/types";

/**
 * Renders the illustration for a scene based on its `visual.kind`.
 * This is the single place new visual kinds get added — episode content
 * files only ever pick a `kind` + light params, never touch this logic.
 */
export const SceneVisual: React.FC<{
  visual: SceneVisualData;
  durationInFrames: number;
}> = ({ visual, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (visual.kind === "character") {
    const scale = visual.pushIn
      ? interpolate(frame, [0, durationInFrames], [1, 1.03], {
          extrapolateRight: "clamp",
        })
      : 1;
    const pop = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
    return (
      <div style={{ transform: `scale(${scale * pop})`, opacity: pop }}>
        <Character width={300} />
      </div>
    );
  }

  if (visual.kind === "characterWithBall") {
    const ballEnter = spring({
      frame: frame - 6,
      fps,
      config: { damping: 200, mass: 0.8, stiffness: 90 },
    });
    const rollOffset = visual.ballRollIn ? (1 - ballEnter) * -140 : 0;
    const rotate = visual.ballRollIn ? (1 - ballEnter) * -220 : 0;
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
        <Character width={280} />
        <div
          style={{
            transform: `translateX(${rollOffset}px) rotate(${rotate}deg)`,
            opacity: visual.ballRollIn ? ballEnter : 1,
            marginBottom: 30,
          }}
        >
          <Basketball size={96} />
        </div>
      </div>
    );
  }

  if (visual.kind === "court") {
    const travel = interpolate(frame, [10, durationInFrames - 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opponentX = 140;
    const opponentY = 90;
    const selfX = 620;
    const selfY = 360;
    const ballX = opponentX + (selfX - opponentX) * travel;
    const ballY = opponentY + (selfY - opponentY) * travel;

    return (
      <div style={{ position: "relative", width: 820, height: 820 * 0.62 }}>
        <Court width={820} />
        <div style={{ position: "absolute", left: opponentX - 17, top: opponentY - 17 }}>
          <PlayerMarker size={34} />
        </div>
        <div style={{ position: "absolute", left: selfX - 19, top: selfY - 19 }}>
          <PlayerMarker size={38} highlight />
        </div>
        <div
          style={{
            position: "absolute",
            left: ballX - 22,
            top: ballY - 22,
            transform: `rotate(${travel * 260}deg)`,
          }}
        >
          <Basketball size={44} />
        </div>
      </div>
    );
  }

  if (visual.kind === "questionMarks") {
    const positions = [
      { x: -150, y: -60, delay: 0 },
      { x: 150, y: -30, delay: 8 },
      { x: 0, y: -170, delay: 16 },
    ];
    return (
      <div style={{ position: "relative", width: 320, height: 340 }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
          <Character width={230} tired />
        </div>
        {positions.slice(0, visual.count).map((p, i) => {
          const pop = spring({
            frame: frame - p.delay,
            fps,
            config: { damping: 12, mass: 0.5, stiffness: 140 },
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                transform: `scale(${pop})`,
                opacity: pop,
              }}
            >
              <QuestionMark size={54} />
            </div>
          );
        })}
      </div>
    );
  }

  if (visual.kind === "sequentialList") {
    const perItem = Math.floor(durationInFrames / visual.items.length);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {visual.items.map((item, i) => {
          const localFrame = frame - i * perItem;
          const reveal = spring({
            frame: localFrame,
            fps,
            config: { damping: 200, mass: 0.6, stiffness: 120 },
          });
          return (
            <React.Fragment key={item}>
              {i > 0 ? (
                <div style={{ opacity: reveal }}>
                  <Arrow seed={60 + i} />
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: theme.font.family,
                  fontSize: 46,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  opacity: reveal,
                  transform: `translateY(${(1 - reveal) * 16}px)`,
                  background: i > 0 ? theme.colors.accentSoft : "transparent",
                  padding: i > 0 ? "6px 22px" : 0,
                  borderRadius: 8,
                }}
              >
                {item}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (visual.kind === "questionChain") {
    const perItem = Math.floor(durationInFrames / visual.items.length);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        {visual.items.map((item, i) => {
          const localFrame = frame - i * perItem;
          const pop = spring({
            frame: localFrame,
            fps,
            config: { damping: 11, mass: 0.5, stiffness: 150 },
          });
          const size = 40 + i * 14;
          return (
            <React.Fragment key={`${item}-${i}`}>
              {i > 0 ? (
                <span
                  style={{
                    fontFamily: theme.font.family,
                    fontSize: 34,
                    color: theme.colors.inkSoft,
                    opacity: pop,
                  }}
                >
                  →
                </span>
              ) : null}
              <div
                style={{
                  fontFamily: theme.font.family,
                  fontSize: size,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  transform: `scale(${pop}) rotate(${i % 2 === 0 ? -3 : 3}deg)`,
                  opacity: pop,
                }}
              >
                {item}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return null;
};
