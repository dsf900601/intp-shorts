# Character assets

The "인치디" mascot is an **image asset slot**, not code-drawn. Drop PNGs here
named after the pose used in content data (`src/content/types.ts`'s
`CharacterPose`, referenced from `src/content/observation-001.ts`'s
`visual.pose`):

```
public/characters/
  thinking.png       Scene 1 - 나는 좋아하는 걸 깊게 파는 사람인 줄 알았다.
  basketball.png     Scene 2 - 농구는 좋아해서 시작한 게 아니었다.
  curious.png        Scene 4, 6 - 왜 자꾸 오지? / 그다음이 궁금해졌다.
  analyzing.png       Scene 5 - 동선/수비/빈자리/패스를 분석하는 중
  realization.png    Scene 7 - 그러다 알았다.
```

Match the existing Instagram feed's illustration style exactly - same face
proportions, hair shape, line weight, expression range, and body
proportions as the posts already published on `@intp.adhd`. Do not invent a
new character design here.

Recommended: transparent-background PNG, roughly 3:3.5 aspect ratio (matches
the `width`/`height` used in `src/components/Character.tsx`), at least
1000px wide for crisp 1080x1920 rendering.

Until a pose's PNG exists, `ObservationReel` renders a labeled dashed-outline
placeholder instead of failing - `Root.tsx`'s `calculateMetadata` checks
each pose file's presence at render time (same mechanism as
`public/audio/`), so nothing needs to change in code once the real art is
dropped in.
