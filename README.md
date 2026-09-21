# 인치디 관찰일지 #C01 — Reels

Remotion project that turns the 4 finished "인치디 관찰일지 #C01" comic images into a single
9:16 vertical reel. No new artwork is generated — the camera (Ken Burns pans/zooms) moves
across the 4 existing images to reveal them piece by piece.

## Spec

- 1080×1920, 30fps, H.264/yuv420p, ~38s
- Composition id: `Reel` (see `src/Video.tsx`)

## Setup

```bash
npm install
```

## Preview / edit interactively

```bash
npm start
```

Opens Remotion Studio, where you can scrub the timeline and tweak keyframes live.

## Render the final mp4

```bash
npm run build
```

Outputs to `out/reel.mp4`.

## Project structure

```
public/images/page{1..4}.png   the 4 source illustrations (untouched)
src/constants.ts                canvas size, scene durations/order, colors
src/shots.ts                    Ken Burns keyframes (cx, cy, zoom) per scene, in
                                 normalized 0-1 image coordinates. This is the file
                                 to edit to retime or reframe any shot.
src/components/KenBurns.tsx     pans/zooms a single image across a keyframe list
src/components/Caption.tsx      hand-writing-style caption chip w/ highlight marker
src/components/SceneFade.tsx    the brief cream fade used only at real page changes
src/Reel.tsx                    assembles all scenes/captions into the timeline
```

### How a shot is defined

Each keyframe is `{ frame, cx, cy, zoom }`:

- `cx`, `cy`: focus point, normalized 0-1 within the 1254×1254 source image.
- `zoom`: 1 = fits the full image height in the 1080×1920 frame (and shows a
  0.5625 = 1080/1920 slice of the width). Higher = tighter crop. Because the
  camera can't show area outside the image, a low zoom aimed near an edge gets
  pinned to that edge — for anything near a corner/edge (e.g. a headline near
  the top), keep zoom high enough (roughly 1.8+) or it will reveal much more
  of the page below/around it than intended.

### Adding narration or BGM later

The render already includes a (silent) AAC audio track, so the pipeline is
audio-ready. To add a voiceover or music bed, drop the file in `public/audio/`
and add an `<Audio src={staticFile('audio/yourfile.mp3')} />` inside
`src/Reel.tsx` (wrap in `<Sequence>` if it needs to start partway through).

## Timeline (current cut)

| Time | Scene | Image |
|---|---|---|
| 0:00–0:04 | "좋아하는 걸 깊게 파는 사람이 아니었다" | page1 |
| 0:04–0:09 | why basketball (diet → club poster) | page2 |
| 0:09–0:21 | the mystery pass, "왜?", the questions | page3 |
| 0:21–0:27 | fast montage — curiosity snowballs | page3 + page4 |
| 0:27–0:31 | injury, still digging in | page4 |
| 0:31–0:38 | thesis + ending | page4 |
