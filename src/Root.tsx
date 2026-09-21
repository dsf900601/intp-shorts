import React from "react";
import { Composition, staticFile } from "remotion";
import { ObservationReel } from "./ObservationReel";
import { observation001 } from "./content/observation-001";
import { EpisodeData } from "./content/types";

const FPS = 30;

const totalFrames = (episode: EpisodeData) =>
  episode.scenes.reduce((sum, s) => sum + s.duration, 0);

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ObservationReel"
        component={ObservationReel}
        durationInFrames={totalFrames(observation001)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          episodeData: observation001,
          hasAudio: false,
        }}
        calculateMetadata={async ({ props }) => {
          // Runs in the browser bundle (Studio + render), so we can't use
          // Node's `fs` here - probe the static file over HTTP instead.
          // This way the reel renders fine whether or not
          // public/audio/<file>.wav has been dropped in yet.
          const audioRelative = props.episodeData.audio;
          let hasAudio = false;
          if (audioRelative) {
            try {
              const res = await fetch(staticFile(audioRelative), {
                method: "HEAD",
              });
              hasAudio = res.ok;
            } catch {
              hasAudio = false;
            }
          }

          return {
            props: { ...props, hasAudio },
            durationInFrames: totalFrames(props.episodeData),
          };
        }}
      />
    </>
  );
};
