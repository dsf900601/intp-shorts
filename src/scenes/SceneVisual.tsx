import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../components/Character";
import { Basketball } from "../components/Basketball";
import { Court } from "../components/Court";
import { PlayerMarker } from "../components/PlayerMarker";
import { QuestionMark } from "../components/QuestionMark";
import { Arrow } from "../components/Arrow";
import { theme } from "../theme";
import { CharacterPose, SceneVisual as SceneVisualData } from "../content/types";

/**
 * Renders the illustration for a scene based on its `visual.kind`. This is
 * the single place new visual kinds get added - episode content files only
 * ever pick a `kind` + a `pose` + light params, never touch this logic.
 * Text is handled separately by ObservationScene; this only draws the
 * character + situation art that fills the middle region of the frame.
 */
export const SceneVisual: React.FC<{
  visual: SceneVisualData;
  durationInFrames: number;
  availablePoses: Record<CharacterPose, boolean>;
}> = ({ visual, durationInFrames, availablePoses }) => {
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
        <Character pose={visual.pose} available={availablePoses[visual.pose]} width={480} />
      </div>
    );
  }

  if (visual.kind === "characterWithBall") {
    const ballEnter = spring({
      frame: frame - 6,
      fps,
      config: { damping: 200, mass: 0.8, stiffness: 90 },
    });
    const rollOffset = visual.ballRollIn ? (1 - ballEnter) * -160 : 0;
    const rotate = visual.ballRollIn ? (1 - ballEnter) * -220 : 0;
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
        <Character pose={visual.pose} available={availablePoses[visual.pose]} width={440} />
        <div
          style={{
            transform: `translateX(${rollOffset}px) rotate(${rotate}deg)`,
            opacity: visual.ballRollIn ? ballEnter : 1,
            marginBottom: 46,
          }}
        >
          <Basketball size={128} />
        </div>
      </div>
    );
  }

  if (visual.kind === "court") {
    const travel = interpolate(frame, [10, durationInFrames - 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opponentX = 150;
    const opponentY = 95;
    const selfX = 660;
    const selfY = 380;
    const ballX = opponentX + (selfX - opponentX) * travel;
    const ballY = opponentY + (selfY - opponentY) * travel;

    return (
      <div style={{ position: "relative", width: 880, height: 880 * 0.62 }}>
        <Court width={880} />
        <div style={{ position: "absolute", left: opponentX - 17, top: opponentY - 17 }}>
          <PlayerMarker size={34} />
        </div>
        <div style={{ position: "absolute", left: selfX - 21, top: selfY - 21 }}>
          <PlayerMarker size={42} highlight />
        </div>
        <div
          style={{
            position: "absolute",
            left: ballX - 24,
            top: ballY - 24,
            transform: `rotate(${travel * 260}deg)`,
          }}
        >
          <Basketball size={48} />
        </div>
      </div>
    );
  }

  if (visual.kind === "questionMarks") {
    const positions = [
      { x: -190, y: -40, delay: 0 },
      { x: 190, y: 0, delay: 8 },
      { x: 0, y: -220, delay: 16 },
    ];
    return (
      <div style={{ position: "relative", width: 480, height: 520, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14 }}>
        <Character pose={visual.pose} available={availablePoses[visual.pose]} width={400} />
        <div style={{ marginBottom: 30 }}>
          <Basketball size={90} />
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
              <QuestionMark size={72} />
            </div>
          );
        })}
      </div>
    );
  }

  if (visual.kind === "sequentialList") {
    const perItem = Math.floor(durationInFrames / visual.items.length);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Character pose={visual.pose} available={availablePoses[visual.pose]} width={340} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
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
                  <div style={{ opacity: reveal, marginLeft: 20 }}>
                    <Arrow seed={60 + i} width={34} height={46} />
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: theme.font.family,
                    fontSize: 52,
                    fontWeight: 700,
                    color: theme.colors.ink,
                    opacity: reveal,
                    transform: `translateY(${(1 - reveal) * 16}px)`,
                    background: i > 0 ? theme.colors.accentSoft : "transparent",
                    padding: i > 0 ? "8px 26px" : 0,
                    borderRadius: 8,
                  }}
                >
                  {item}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.kind === "questionChain") {
    const perItem = Math.floor(durationInFrames / visual.items.length);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <Character pose={visual.pose} available={availablePoses[visual.pose]} width={360} />
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {visual.items.map((item, i) => {
            const localFrame = frame - i * perItem;
            const pop = spring({
              frame: localFrame,
              fps,
              config: { damping: 11, mass: 0.5, stiffness: 150 },
            });
            const size = 44 + i * 16;
            return (
              <React.Fragment key={`${item}-${i}`}>
                {i > 0 ? (
                  <span
                    style={{
                      fontFamily: theme.font.family,
                      fontSize: 38,
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
      </div>
    );
  }

  return null;
};
