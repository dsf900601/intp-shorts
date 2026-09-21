// A crop window in the *source* feed image's own pixel space (all feed
// images for this episode are 1254x1254 squares - see sourceNaturalSize).
export interface ImageCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PanDirection = "zoomIn" | "panLeft" | "panRight" | "panUp" | "panDown" | "none";

export interface SceneImage {
  /** key into EpisodeData.sourceImages */
  source: string;
  /** the region of interest inside the source image, in source px */
  crop: ImageCrop;
  /**
   * 0..1 bias used when the crop's aspect ratio doesn't match the frame and
   * one axis has to be trimmed further to cover it - which edge of `crop`
   * stays fully visible. Defaults to centered (0.5/0.5).
   */
  focus?: { x: number; y: number };
  /** very subtle Ken Burns motion - see FeedImage for the actual amounts */
  motion?: PanDirection;
}

export interface Scene {
  id: string;
  /** frames at the composition's fps */
  duration: number;
  /** caption lines - short, 1-3 lines, shown as one reveal group */
  text: string[];
  /** bigger caption treatment for pivot / final beats */
  emphasis?: boolean;
  image: SceneImage;
}

export interface EpisodeData {
  episode: string;
  series: string;
  account: string;
  title: string;
  /** relative to public/, e.g. "audio/reel-001.wav" */
  audio?: string;
  /** key -> path relative to public/, e.g. "feed-1": "source/observation-001/feed-1.jpg" */
  sourceImages: Record<string, string>;
  sourceNaturalSize: { width: number; height: number };
  scenes: Scene[];
}
