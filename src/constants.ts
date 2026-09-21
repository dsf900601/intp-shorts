export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const IMAGE_SIZE = 1254;

// Scene durations in frames (@30fps)
export const SCENE = {
	s1: 120, // 0:00-0:04 page1 intro
	s2: 150, // 0:04-0:09 page2 why basketball
	s34: 360, // 0:09-0:21 page3 the pass / "why?" + analysis questions (one continuous page, no cut)
	montage: 180, // 0:21-0:27 fast montage page3/page4
	injury: 120, // 0:27-0:31 page4 injury, still digging
	conclusion: 210, // 0:31-0:38 page4 conclusion
};

export const STARTS = (() => {
	const order: (keyof typeof SCENE)[] = ['s1', 's2', 's34', 'montage', 'injury', 'conclusion'];
	let acc = 0;
	const out: Record<string, number> = {};
	for (const key of order) {
		out[key] = acc;
		acc += SCENE[key];
	}
	return out as Record<keyof typeof SCENE, number>;
})();

export const TOTAL_DURATION = Object.values(SCENE).reduce((a, b) => a + b, 0);

export const IMAGES = {
	page1: 'images/page1.png',
	page2: 'images/page2.png',
	page3: 'images/page3.png',
	page4: 'images/page4.png',
};

export const COLORS = {
	cream: '#F6F1E4',
	ink: '#3A322A',
	highlight: '#FCE68C',
	chipBg: 'rgba(250, 246, 234, 0.94)',
};
