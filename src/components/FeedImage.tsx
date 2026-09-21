import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SceneImage } from "../content/types";

const FRAME_W = 1080;
const FRAME_H = 1920;
const FRAME_AR = FRAME_W / FRAME_H;

/**
 * Renders a hand-picked crop of one of the real 「인치디 관찰일지」 feed
 * illustrations, full-bleed, "cover"-fit into the 1080x1920 frame, with a
 * very slight Ken Burns drift. This is the video's only visual source -
 * nothing here is code-drawn.
 */
export const FeedImage: React.FC<{
  image: SceneImage;
  src: string;
  naturalSize: { width: number; height: number };
  durationInFrames: number;
}> = ({ image, src, naturalSize, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { crop, focus = { x: 0.5, y: 0.5 } } = image;

  // Trim the crop down to the frame's aspect ratio, biased by `focus`,
  // so the chosen region "covers" 1080x1920 without distortion.
  const cropAR = crop.w / crop.h;
  let cx = crop.x;
  let cy = crop.y;
  let cw = crop.w;
  let ch = crop.h;
  if (cropAR > FRAME_AR) {
    const newW = crop.h * FRAME_AR;
    cx = crop.x + (crop.w - newW) * focus.x;
    cw = newW;
  } else {
    const newH = crop.w / FRAME_AR;
    cy = crop.y + (crop.h - newH) * focus.y;
    ch = newH;
  }

  const scaleBase = FRAME_W / cw; // == FRAME_H / ch

  // Very subtle Ken Burns: scale 1 -> 1.035, and/or a 10-30px drift.
  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const zoom = 1 + 0.035 * t;
  const drift = 22 * t;
  let panX = 0;
  let panY = 0;
  const motion = image.motion ?? "zoomIn";
  if (motion === "panLeft") panX = -drift;
  if (motion === "panRight") panX = drift;
  if (motion === "panUp") panY = -drift;
  if (motion === "panDown") panY = drift;

  const displayW = naturalSize.width * scaleBase;
  const displayH = naturalSize.height * scaleBase;
  const left = -cx * scaleBase;
  const top = -cy * scaleBase;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: displayW,
          height: displayH,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: `${(cx + cw / 2) * scaleBase}px ${(cy + ch / 2) * scaleBase}px`,
        }}
      >
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
};
