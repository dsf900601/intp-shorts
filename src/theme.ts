import { fontFamily } from "./font";

export const theme = {
  colors: {
    paper: "#F5EFE1", // ivory / off-white paper (unused while every scene is a
    paperShadow: "#E9E0CB", // full-bleed feed photo, kept for a future episode
    ink: "#2B2A28", // that has no source art yet and falls back to a plain look)
    inkSoft: "#5B5852",
    accent: "#F4D35E",
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
} as const;
