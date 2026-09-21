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
    side: 90,
  },
} as const;
