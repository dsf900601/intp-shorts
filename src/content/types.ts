export type SceneVisual =
  | { kind: "character"; pushIn?: boolean }
  | { kind: "characterWithBall"; ballRollIn?: boolean; holdStill?: boolean }
  | { kind: "court"; ballTravel?: boolean }
  | { kind: "questionMarks"; count: number }
  | { kind: "sequentialList"; items: string[] }
  | { kind: "questionChain"; items: string[] };

export interface Scene {
  id: string;
  /** frames at the composition's fps */
  duration: number;
  type:
    | "intro"
    | "hook"
    | "context"
    | "question"
    | "analysis"
    | "escalation"
    | "conclusion";
  text: string[];
  subtext?: string;
  /** extra lines rendered with stronger emphasis (bigger / bolder) */
  emphasisText?: string[];
  emphasis?: "normal" | "large";
  visual: SceneVisual;
  showEpisodeLabel?: boolean;
}

export interface EpisodeData {
  episode: string;
  series: string;
  account: string;
  title: string;
  /** relative to public/, e.g. "audio/reel-001.wav" */
  audio?: string;
  scenes: Scene[];
}
