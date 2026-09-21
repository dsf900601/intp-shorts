import type {Keyframe} from './components/KenBurns';

// All coordinates are normalized (0-1) within the 1254x1254 source image,
// derived by fitting known content boxes to the 1080x1920 viewport, with a
// zoom floor of ~1.4 so a wide-but-short text box never over-reveals the
// full image height (visible-height fraction = 1/zoom). Verified against
// rendered stills and re-tuned where the crop didn't match the artwork.

export const SCENE1_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.65, cy: 0.675, zoom: 1.73},
	{frame: 30, cx: 0.43, cy: 0.57, zoom: 1.4},
	{frame: 75, cx: 0.365, cy: 0.385, zoom: 1.4},
	{frame: 120, cx: 0.39, cy: 0.4, zoom: 1.35},
];

export const SCENE2_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.3, cy: 0.357, zoom: 1.4},
	{frame: 40, cx: 0.3, cy: 0.357, zoom: 1.4},
	{frame: 60, cx: 0.675, cy: 0.242, zoom: 2.07},
	{frame: 95, cx: 0.76, cy: 0.357, zoom: 1.4},
	{frame: 120, cx: 0.815, cy: 0.671, zoom: 1.52},
	{frame: 150, cx: 0.75, cy: 0.643, zoom: 1.4},
];

export const SCENE34_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.74, cy: 0.357, zoom: 1.4},
	{frame: 25, cx: 0.76, cy: 0.309, zoom: 1.62},
	{frame: 55, cx: 0.72, cy: 0.35, zoom: 1.45},
	{frame: 90, cx: 0.27, cy: 0.6, zoom: 1.4},
	{frame: 148, cx: 0.29, cy: 0.6, zoom: 1.4},
	{frame: 150, cx: 0.815, cy: 0.66, zoom: 1.52},
	{frame: 205, cx: 0.891, cy: 0.74, zoom: 2.59},
	{frame: 260, cx: 0.86, cy: 0.71, zoom: 2.3},
	{frame: 310, cx: 0.24, cy: 0.643, zoom: 1.4},
	{frame: 360, cx: 0.765, cy: 0.643, zoom: 1.4},
];

export const MONTAGE_KEYFRAMES: Keyframe[][] = [
	[
		{frame: 0, cx: 0.765, cy: 0.643, zoom: 1.4},
		{frame: 21, cx: 0.78, cy: 0.6, zoom: 1.55},
	],
	[
		{frame: 0, cx: 0.79, cy: 0.15, zoom: 1.9},
		{frame: 21, cx: 0.82, cy: 0.13, zoom: 2.1},
	],
	[
		{frame: 0, cx: 0.815, cy: 0.66, zoom: 1.52},
		{frame: 21, cx: 0.85, cy: 0.7, zoom: 1.9},
	],
	[
		{frame: 0, cx: 0.76, cy: 0.309, zoom: 1.62},
		{frame: 15, cx: 0.78, cy: 0.28, zoom: 1.9},
	],
	[
		{frame: 0, cx: 0.78, cy: 0.38, zoom: 1.7},
		{frame: 21, cx: 0.82, cy: 0.35, zoom: 1.9},
	],
	[
		{frame: 0, cx: 0.891, cy: 0.74, zoom: 2.59},
		{frame: 21, cx: 0.86, cy: 0.71, zoom: 2.4},
	],
];
export const MONTAGE_SHOT_IMAGE: ('page3' | 'page4')[] = [
	'page3',
	'page4',
	'page3',
	'page3',
	'page4',
	'page3',
];
export const MONTAGE_SHOT_DURATIONS = [21, 21, 21, 15, 21, 21];
export const MONTAGE_BRIDGE_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.2, cy: 0.3, zoom: 1.6},
	{frame: 60, cx: 0.35, cy: 0.39, zoom: 2.1},
];

// Headline sits in a short 0.03-0.13 strip near the top edge, so a low zoom
// there gets edge-pinned and reveals almost the whole page below it (visible
// height fraction = 1/zoom, pinned from y=0). Zoom in tight and pan across
// instead of trying to fit the whole wide line at once.
export const INJURY_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.2, cy: 0.12, zoom: 2.3},
	{frame: 25, cx: 0.35, cy: 0.15, zoom: 2.1},
	{frame: 55, cx: 0.2, cy: 0.32, zoom: 1.8},
	{frame: 90, cx: 0.35, cy: 0.39, zoom: 2.2},
	{frame: 120, cx: 0.78, cy: 0.2, zoom: 1.9},
];

export const CONCLUSION_KEYFRAMES: Keyframe[] = [
	{frame: 0, cx: 0.4, cy: 0.56, zoom: 2.6},
	{frame: 45, cx: 0.49, cy: 0.6, zoom: 2.8},
	{frame: 85, cx: 0.58, cy: 0.65, zoom: 2.4},
	{frame: 120, cx: 0.48, cy: 0.75, zoom: 1.8},
	{frame: 160, cx: 0.45, cy: 0.84, zoom: 1.9},
	{frame: 185, cx: 0.65, cy: 0.85, zoom: 1.8},
	{frame: 210, cx: 0.815, cy: 0.86, zoom: 2.2},
];
