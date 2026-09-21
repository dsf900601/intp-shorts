import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { SceneText } from "../components/SceneText";
import { EpisodeLabel } from "../components/EpisodeLabel";
import { SceneVisual } from "./SceneVisual";
import { theme } from "../theme";
import { CharacterPose, Scene } from "../content/types";

const Subtext: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontFamily: theme.font.family,
      fontSize: 32,
      color: theme.colors.inkSoft,
      borderBottom: `2px dashed ${theme.colors.inkSoft}`,
      paddingBottom: 4,
    }}
  >
    {text}
  </div>
);

export const ObservationScene: React.FC<{
  scene: Scene;
  series: string;
  episode: string;
  availablePoses: Record<CharacterPose, boolean>;
}> = ({ scene, series, episode, availablePoses }) => {
  const label = <EpisodeLabel series={series} episode={episode} small />;
  const visual = (
    <SceneVisual
      visual={scene.visual}
      durationInFrames={scene.duration}
      availablePoses={availablePoses}
    />
  );

  // Scene 4 ("왜 오늘은 나한테 공이 자꾸 오지?") is the video's pivot: the
  // brief asks for it to drop the label/bottom-caption structure entirely
  // and just center a big question over a minimal character+ball+? visual.
  if (scene.type === "question") {
    return (
      <SceneFrame durationInFrames={scene.duration}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
          }}
        >
          <SceneText lines={scene.text} fontSize={theme.type.emphasis} delayPerLine={8} />
          {visual}
        </div>
      </SceneFrame>
    );
  }

  if (scene.type === "conclusion") {
    return (
      <SceneFrame
        durationInFrames={scene.duration}
        top={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {label}
            <SceneText lines={scene.text} fontSize={theme.type.tierSmall} delayPerLine={6} fontWeight={500} />
          </div>
        }
        middle={visual}
        bottom={
          scene.emphasisText ? (
            <>
              <SceneText
                lines={[scene.emphasisText[0]]}
                fontSize={theme.type.tierMedium}
                delayPerLine={8}
              />
              <SceneText
                lines={scene.emphasisText.slice(1)}
                fontSize={theme.type.tierLarge}
                delayPerLine={10}
                style={{ marginTop: 6 }}
              />
            </>
          ) : null
        }
      />
    );
  }

  if (scene.type === "analysis") {
    return (
      <SceneFrame
        durationInFrames={scene.duration}
        top={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {label}
            <SceneText lines={scene.text} fontSize={theme.type.lead} />
          </div>
        }
        middle={visual}
      />
    );
  }

  // intro / hook / context / escalation: label on top, character + situation
  // art in the middle, the scene's key sentence large at the bottom.
  return (
    <SceneFrame
      durationInFrames={scene.duration}
      top={label}
      middle={visual}
      bottom={
        <>
          <SceneText lines={scene.text} fontSize={theme.type.body} />
          {scene.subtext ? <Subtext text={scene.subtext} /> : null}
        </>
      }
    />
  );
};
