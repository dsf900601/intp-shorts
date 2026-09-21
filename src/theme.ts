import { fontFamily } from "./font";

export const theme = {
  colors: {
    paper: "#F5EFE1", // ivory / off-white paper
    paperShadow: "#E9E0CB",
    ink: "#2B2A28", // near-black charcoal, not pure black
    inkSoft: "#5B5852",
    accent: "#F4D35E", // soft muted yellow highlight
    accentSoft: "#FBEBB5",
  },
  font: {
    family: `${fontFamily}, sans-serif`,
  },
  safeZone: {
    top: 220, // keep clear of profile/caption UI
    bottom: 260, // keep clear of like/comment/share rail caption area
    side: 72,
  },
  // Vertical split of the safe area, used by SceneFrame's 3-region layout:
  // top = label / short lead-in, middle = character + situation art,
  // bottom = the scene's key sentence. Sums to 100.
  regions: {
    top: 18,
    middle: 52,
    bottom: 30,
  },
  type: {
    label: 34,
    lead: 46,
    body: 72,
    emphasis: 88,
    tierSmall: 46,
    tierMedium: 64,
    tierLarge: 96,
  },
} as const;
