import { gaeguBoldBase64, gaeguRegularBase64 } from "./fontData";

// Gaegu: a casual, hand-written-feel Google Font with Hangul support -
// matches the "손글씨/메모 느낌" (handwritten note) direction from the brief.
//
// Embedded as a base64 data URI (src/fontData.ts, generated from
// public/fonts/Gaegu-*.woff2) rather than fetched over the network or
// loaded async via delayRender: headless rendering opens many short-lived
// browser pages, and an async font fetch/load race was intermittently
// hanging renders. A data URI is parsed synchronously with the stylesheet,
// so there is nothing to wait for.
//
// The subset in these files only covers the characters used by
// src/content/observation-001.ts - if a future episode's text needs new
// Hangul syllables, request a wider subset from
// https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&text=<chars>,
// overwrite public/fonts/Gaegu-*.woff2, and regenerate src/fontData.ts
// (see scripts/embed-font.js).
export const fontFamily = "Gaegu";

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  font-weight: 400;
  src: url(data:font/woff2;base64,${gaeguRegularBase64}) format('woff2');
}
@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  font-weight: 700;
  src: url(data:font/woff2;base64,${gaeguBoldBase64}) format('woff2');
}
`;
  document.head.appendChild(style);
}
