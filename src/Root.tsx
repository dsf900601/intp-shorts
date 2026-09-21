import React from "react";
import { Composition, staticFile } from "remotion";
import { ObservationReel } from "./ObservationReel";
import { observation001 } from "./content/observation-001";
import { CharacterPose, EpisodeData } from "./content/types";

const FPS = 30;

const totalFrames = (episode: EpisodeData) =>
  episode.scenes.reduce((sum, s) => sum + s.duration, 0);

const posesUsedIn = (episode: EpisodeData): CharacterPose[] => {
  const poses = new Set<CharacterPose>();
  for (const scene of episode.scenes) {
    if ("pose" in scene.visual) {
      poses.add(scene.visual.pose);
    }
  }
  return Array.from(poses);
};

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
          availablePoses: {} as Record<CharacterPose, boolean>,
        }}
        calculateMetadata={async ({ props }) => {
          // Runs in the browser bundle (Studio + render), so we can't use
          // Node's `fs` here - probe static files over HTTP instead. This
          // way the reel renders fine whether or not public/audio/<file>.wav
          // or public/characters/<pose>.png have been dropped in yet.
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

          const poses = posesUsedIn(props.episodeData);
          const availabilityChecks = await Promise.all(
            poses.map(async (pose) => {
              try {
                const res = await fetch(
                  staticFile(`characters/${pose}.png`),
                  { method: "HEAD" }
                );
                return [pose, res.ok] as const;
              } catch {
                return [pose, false] as const;
              }
            })
          );
          const availablePoses = Object.fromEntries(
            availabilityChecks
          ) as Record<CharacterPose, boolean>;

          return {
            props: { ...props, hasAudio, availablePoses },
            durationInFrames: totalFrames(props.episodeData),
          };
        }}
      />
    </>
  );
};
