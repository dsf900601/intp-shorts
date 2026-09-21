import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { SceneText } from "../components/SceneText";
import { EpisodeLabel } from "../components/EpisodeLabel";
import { SceneVisual } from "./SceneVisual";
import { theme } from "../theme";
import { Scene } from "../content/types";

export const ObservationScene: React.FC<{
  scene: Scene;
  series: string;
  episode: string;
}> = ({ scene, series, episode }) => {
  const mainFontSize = scene.emphasis === "large" ? 72 : 56;

  return (
    <SceneFrame durationInFrames={scene.duration}>
      {scene.showEpisodeLabel ? <EpisodeLabel series={series} episode={episode} /> : null}

      <SceneText lines={scene.text} fontSize={mainFontSize} />

      {scene.subtext ? (
        <div
          style={{
            fontFamily: theme.font.family,
            fontSize: 32,
            color: theme.colors.inkSoft,
            borderBottom: `2px dashed ${theme.colors.inkSoft}`,
            paddingBottom: 4,
          }}
        >
          {scene.subtext}
        </div>
      ) : null}

      <SceneVisual visual={scene.visual} durationInFrames={scene.duration} />

      {scene.emphasisText ? (
        <SceneText
          lines={scene.emphasisText}
          fontSize={54}
          delayPerLine={10}
          color={theme.colors.ink}
          style={{ marginTop: 4 }}
        />
      ) : null}
    </SceneFrame>
  );
};
