import { EpisodeData } from "./types";

// 인치디 관찰일지 #001 - "패스가 자꾸 온다"
// 다음 화를 만들 때는 이 파일과 같은 형태의 새 파일(observation-002.ts 등)만
// 추가하면 된다. 컴포넌트는 건드리지 않는다.
export const observation001: EpisodeData = {
  episode: "001",
  series: "인치디 관찰일지",
  account: "@intp.adhd",
  title: "왜 오늘은 나한테 공이 자꾸 오지?",
  audio: "audio/reel-001.wav",
  scenes: [
    {
      id: "scene-1-intro",
      type: "intro",
      duration: 90, // 0:00 - 0:03
      text: ["나는 좋아하는 걸", "깊게 파는 사람인 줄 알았다."],
      visual: { kind: "character", pose: "thinking", pushIn: true },
      showEpisodeLabel: true,
    },
    {
      id: "scene-2-hook",
      type: "hook",
      duration: 90, // 0:03 - 0:06
      text: ["근데 농구는", "좋아해서 시작한 게 아니었다."],
      subtext: "다이어트하려고 시작함.",
      visual: { kind: "characterWithBall", pose: "basketball", ballRollIn: true },
    },
    {
      id: "scene-3-context",
      type: "context",
      duration: 120, // 0:06 - 0:10
      text: ["그러다 어느 날", "이상하게 나한테", "패스가 계속 왔다."],
      visual: { kind: "court", ballTravel: true },
    },
    {
      id: "scene-4-question",
      type: "question",
      duration: 90, // 0:10 - 0:13
      text: ["왜 오늘은 나한테", "공이 자꾸 오지?"],
      emphasis: "large",
      visual: { kind: "questionMarks", pose: "curious", count: 3 },
    },
    {
      id: "scene-5-analysis",
      type: "analysis",
      duration: 150, // 0:13 - 0:18
      text: ["그때부터 일이 커졌다."],
      visual: {
        kind: "sequentialList",
        pose: "analyzing",
        items: ["내 동선", "수비 움직임", "빈자리", "패스"],
      },
    },
    {
      id: "scene-6-escalation",
      type: "escalation",
      duration: 90, // 0:18 - 0:21
      text: ["하나를 이해하니까", "그다음이 궁금해졌다."],
      visual: { kind: "questionChain", pose: "curious", items: ["WHY?", "?", "?"] },
    },
    {
      id: "scene-7-conclusion",
      type: "conclusion",
      duration: 180, // 0:21 - 0:27
      text: ["그러다 알았다."],
      emphasisText: [
        "나는 좋아하는 걸 파는 게 아니라",
        "이해하고 싶은 걸",
        "좋아하게 되는",
        "사람이었다.",
      ],
      visual: { kind: "characterWithBall", pose: "realization", holdStill: true },
      showEpisodeLabel: true,
    },
  ],
};
