import React from "react";
import { Audio, Series, staticFile } from "remotion";
import { EpisodeData } from "./content/types";
import { ObservationScene } from "./scenes/ObservationScene";

/**
 * The single reusable engine for every "인치디 관찰일지" reel.
 * A new episode = a new file in src/content/ with the same shape as
 * observation-001.ts. Nothing in this component is episode-specific.
 */
export const ObservationReel: React.FC<{
  episodeData: EpisodeData;
  hasAudio: boolean;
}> = ({ episodeData, hasAudio }) => {
  return (
    <>
      {hasAudio && episodeData.audio ? (
        <Audio src={staticFile(episodeData.audio)} />
      ) : null}

      <Series>
        {episodeData.scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.duration}>
            <ObservationScene
              scene={scene}
              series={episodeData.series}
              episode={episodeData.episode}
            />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};
