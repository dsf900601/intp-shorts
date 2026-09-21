import React, { useMemo } from "react";
import { getGenerator } from "./sketch";
import { RoughShape } from "./RoughShape";
import { theme } from "../theme";

/**
 * The "인치디" mascot, drawn procedurally in a rough hand-sketched style
 * with roughjs (no character art asset exists in this repo yet — this
 * placeholder keeps the same silhouette/props across every scene so it
 * can be swapped for real character art later without touching layout).
 */
export const Character: React.FC<{
  width?: number;
  tired?: boolean;
}> = ({ width = 280, tired = true }) => {
  const height = width * (380 / 260);

  const shapes = useMemo(() => {
    const gen = getGenerator();
    const opts = {
      stroke: theme.colors.ink,
      strokeWidth: 3.2,
      roughness: 1.9,
      bowing: 1.6,
      seed: 7,
    };

    const torso = gen.path(
      "M60,220 C50,290 65,345 130,350 C195,345 212,288 200,220 C210,170 185,130 130,128 C75,130 50,170 60,220 Z",
      { ...opts, fill: theme.colors.paper, fillStyle: "solid", seed: 8 }
    );

    const head = gen.circle(130, 88, 108, {
      ...opts,
      fill: theme.colors.paper,
      fillStyle: "solid",
      seed: 9,
    });

    // scribble hair
    const hair = gen.path(
      "M78,42 C90,18 112,8 130,10 C150,8 172,18 184,44 C170,36 150,32 130,32 C110,32 92,36 78,42 Z",
      { ...opts, fill: theme.colors.ink, fillStyle: "hachure", hachureGap: 3, seed: 10 }
    );

    const eyeL = gen.ellipse(107, 92, 9, 11, { ...opts, fill: theme.colors.ink, fillStyle: "solid", seed: 11 });
    const eyeR = gen.ellipse(153, 92, 9, 11, { ...opts, fill: theme.colors.ink, fillStyle: "solid", seed: 12 });

    // slightly tired under-eye marks
    const tiredMarkL = tired
      ? gen.line(96, 106, 116, 108, { ...opts, strokeWidth: 2, seed: 13 })
      : null;
    const tiredMarkR = tired
      ? gen.line(144, 108, 164, 106, { ...opts, strokeWidth: 2, seed: 14 })
      : null;

    // neutral, slightly flat mouth
    const mouth = gen.line(115, 122, 145, 122, { ...opts, strokeWidth: 2.6, seed: 15 });

    const armL = gen.path("M65,235 C40,255 30,285 38,315", { ...opts, seed: 16 });
    const armR = gen.path("M195,235 C220,255 230,285 222,315", { ...opts, seed: 17 });

    return { torso, head, hair, eyeL, eyeR, tiredMarkL, tiredMarkR, mouth, armL, armR };
  }, [tired]);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 260 380"
      style={{ display: "block", overflow: "visible" }}
    >
      <RoughShape drawable={shapes.armL} />
      <RoughShape drawable={shapes.armR} />
      <RoughShape drawable={shapes.torso} />
      <RoughShape drawable={shapes.head} />
      <RoughShape drawable={shapes.hair} />
      <RoughShape drawable={shapes.eyeL} />
      <RoughShape drawable={shapes.eyeR} />
      {shapes.tiredMarkL ? <RoughShape drawable={shapes.tiredMarkL} /> : null}
      {shapes.tiredMarkR ? <RoughShape drawable={shapes.tiredMarkR} /> : null}
      <RoughShape drawable={shapes.mouth} />
    </svg>
  );
};
