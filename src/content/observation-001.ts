import { EpisodeData } from "./types";

// 인치디 관찰일지 #001 - "패스가 자꾸 온다"
//
// Every visual in this episode is a hand-picked crop of the 4 real feed
// illustrations (public/source/observation-001/feed-1..4.jpg, the actual
// "인치디 관찰일지 #001" Instagram carousel), not code-drawn art. A crop
// is {x,y,w,h} in that source image's own pixel space (1254x1254 - see
// sourceNaturalSize below); FeedImage cover-fits it into the 1080x1920
// frame. `focus` (0..1) biases which edge stays visible if the crop's
// aspect ratio doesn't already match 9:16.
//
// Next episode: add its own feed-N.jpg files under public/source/<id>/,
// list them in sourceImages, and write new scenes - nothing else here is
// episode-specific.
export const observation001: EpisodeData = {
  episode: "001",
  series: "인치디 관찰일지",
  account: "@intp.adhd",
  title: "왜 오늘은 나한테 공이 자꾸 오지?",
  audio: "audio/reel-001.wav",
  sourceImages: {
    "feed-1": "source/observation-001/feed-1.jpg", // 1/4 - thinking desk / intro
    "feed-2": "source/observation-001/feed-2.jpg", // 2/4 - why basketball started
    "feed-3": "source/observation-001/feed-3.jpg", // 3/4 - the pass / the question / analysis
    "feed-4": "source/observation-001/feed-4.jpg", // 4/4 - injury / deeper analysis / conclusion
  },
  sourceNaturalSize: { width: 1254, height: 1254 },
  scenes: [
    {
      id: "s01-intro",
      duration: 66,
      text: ["나는 좋아하는 걸", "깊게 파는 사람인 줄 알았다."],
      image: {
        source: "feed-1",
        crop: { x: 520, y: 420, w: 680, h: 800 },
        motion: "zoomIn",
      },
    },
    {
      id: "s02-not-from-start",
      duration: 60,
      text: ["근데 농구는 처음부터", "좋아하지 않았다."],
      image: {
        source: "feed-2",
        crop: { x: 0, y: 850, w: 620, h: 404 },
        motion: "panRight",
      },
    },
    {
      id: "s03-diet",
      duration: 60,
      text: ["그냥 살을 빼려고", "시작한 거였다."],
      image: {
        source: "feed-2",
        crop: { x: 620, y: 0, w: 634, h: 650 },
        motion: "zoomIn",
      },
    },
    {
      id: "s04-pass",
      duration: 69,
      text: ["그러다 어느 날,", "이상하게 나한테", "패스가 계속 왔다."],
      image: {
        source: "feed-3",
        crop: { x: 560, y: 0, w: 694, h: 560 },
        motion: "panLeft",
      },
    },
    {
      id: "s05-question",
      duration: 90,
      emphasis: true,
      text: ["왜 오늘은 나한테", "공이 자꾸 오지?"],
      image: {
        source: "feed-3",
        crop: { x: 0, y: 560, w: 560, h: 500 },
        motion: "zoomIn",
      },
    },
    {
      id: "s06-watch-myself",
      duration: 60,
      text: ["내가 어떻게 움직였는지", "보기 시작했다."],
      image: {
        source: "feed-3",
        crop: { x: 560, y: 560, w: 694, h: 500 },
        motion: "panUp",
      },
    },
    {
      id: "s07-watch-defense",
      duration: 60,
      text: ["수비가 왜 그렇게", "반응하는지도 보고,"],
      image: {
        source: "feed-4",
        crop: { x: 560, y: 260, w: 694, h: 390 },
        motion: "zoomIn",
      },
    },
    {
      id: "s08-open-space",
      duration: 60,
      text: ["빈자리는 언제", "생기는지도."],
      image: {
        source: "feed-4",
        crop: { x: 560, y: 400, w: 500, h: 300 },
        motion: "panRight",
      },
    },
    {
      id: "s09-curiosity-grows",
      duration: 78,
      text: ["하나를 이해하니까", "다음이 궁금해졌다."],
      image: {
        source: "feed-4",
        crop: { x: 750, y: 450, w: 500, h: 320 },
        motion: "panLeft",
      },
    },
    {
      id: "s10-injury",
      duration: 84,
      text: ["그러다 십자인대가", "파열됐다."],
      image: {
        source: "feed-4",
        crop: { x: 170, y: 150, w: 480, h: 520 },
        motion: "zoomIn",
      },
    },
    {
      id: "s11-didnt-stop",
      duration: 78,
      text: ["근데 나는 농구를", "그만두지 않았다."],
      image: {
        source: "feed-4",
        crop: { x: 170, y: 150, w: 480, h: 520 },
        motion: "panDown",
      },
    },
    {
      id: "s12-realization-beat",
      duration: 48,
      text: ["그러다 알았다."],
      image: {
        source: "feed-4",
        crop: { x: 340, y: 800, w: 420, h: 380 },
        motion: "zoomIn",
      },
    },
    {
      id: "s13-final",
      duration: 108,
      emphasis: true,
      text: [
        "나는 좋아하는 걸",
        "파는 사람이 아니라,",
        "이해하고 싶은 걸",
        "좋아하게 되는",
        "사람이었다.",
      ],
      image: {
        source: "feed-4",
        crop: { x: 300, y: 790, w: 560, h: 464 },
        motion: "zoomIn",
      },
    },
  ],
};
