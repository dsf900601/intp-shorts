import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FeedImage } from "../components/FeedImage";
import { Caption } from "../components/Caption";
import { theme } from "../theme";
import { EpisodeData, Scene } from "../content/types";

const TRANSITION = 12;

export const ObservationScene: React.FC<{
  scene: Scene;
  episodeData: EpisodeData;
  showLabel?: boolean;
}> = ({ scene, episodeData, showLabel }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, TRANSITION, scene.duration - TRANSITION, scene.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const src = episodeData.sourceImages[scene.image.source];

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <FeedImage
        image={scene.image}
        src={src}
        naturalSize={episodeData.sourceNaturalSize}
        durationInFrames={scene.duration}
      />

      {showLabel ? (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: theme.safeZone.side,
            fontFamily: theme.font.family,
            fontSize: 30,
            color: "#FFFDF7",
            letterSpacing: 0.5,
            textShadow: "0 2px 4px rgba(0,0,0,0.4), 0 0 2px rgba(0,0,0,0.8)",
          }}
        >
          {episodeData.series} #{episodeData.episode}
        </div>
      ) : null}

      <Caption lines={scene.text} emphasis={scene.emphasis} />
    </div>
  );
};
