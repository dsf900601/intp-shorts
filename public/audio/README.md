# Voice audio

Drop the narration file for each episode here, named to match `EpisodeData.audio`
in `src/content/observation-XXX.ts`.

For episode 001 that is:

```
public/audio/reel-001.wav
```

If the file is missing, `ObservationReel` still renders normally (silent) —
`calculateMetadata` in `src/Root.tsx` checks for the file at render time and
only mounts the `<Audio>` track when it exists. No code changes are needed
once the real voice file (윤나리) is dropped in; just add the file and
re-render.

Once real narration exists, each scene's `duration` in the content file
should be adjusted to match the voice timing.
