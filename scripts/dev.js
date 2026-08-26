/**
 * npm run dev
 * 브라우저 미리보기용 로컬 서버. http://localhost:PORT 로 접속해
 * 1080x1920 영상 화면이 실시간으로 반복 재생되는 것을 확인할 수 있다.
 */

const path = require("path");
const { createStaticServer } = require("./static-server");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;
const ROOT = path.resolve(__dirname, "..");

const server = createStaticServer(ROOT);
server.listen(PORT, () => {
  console.log(`\n미리보기 서버 시작됨: http://localhost:${PORT}`);
  console.log("종료하려면 Ctrl+C 를 누르세요.\n");
});
