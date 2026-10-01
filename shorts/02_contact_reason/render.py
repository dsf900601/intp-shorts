"""2순위 숏츠 — 「몇 달 만의 연락은 오히려 쉽다」

1080x1920 / 30fps / 약 27초 세로 영상을 렌더링한다.
의존성: Pillow, numpy, ffmpeg (PATH)

    python3 shorts/02_contact_reason/render.py
    -> shorts/02_contact_reason/out/contact_reason.mp4
"""
import math
import os
import subprocess
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
FONT_DIR = os.path.join(ROOT, "assets", "fonts")
OUT_DIR = os.path.join(HERE, "out")

W, H, FPS = 1080, 1920, 30
DURATION = 27.0
SR = 44100

# ---------------------------------------------------------------- palette
BG_TOP = (18, 20, 27)
BG_BOT = (10, 11, 15)
WHITE = (245, 245, 247)
GRAY = (150, 154, 165)
DIM = (95, 99, 110)
ACCENT = (255, 213, 74)       # 강조 노랑
RED = (255, 92, 92)
PANEL = (28, 31, 40)
PANEL_LINE = (44, 48, 60)
BUBBLE_ME = (255, 221, 87)
BUBBLE_THEM = (52, 56, 70)


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Pretendard-{weight}.otf"), size)


F_TITLE = font("ExtraBold", 50)
F_BIG = font("ExtraBold", 92)
F_MID = font("Bold", 72)
F_CAP = font("Bold", 64)
F_CHAT = font("Bold", 46)
F_SMALL = font("Medium", 32)
F_NAME = font("Bold", 40)


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def lerp(a, b, x):
    return a + (b - a) * x


def mix(c1, c2, x):
    return tuple(int(lerp(a, b, x)) for a, b in zip(c1, c2))


# ---------------------------------------------------------------- background
def make_bg():
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array(BG_TOP), np.array(BG_BOT)
    arr = (top * (1 - y) + bot * y) * np.ones((1, W, 1))
    # 은은한 비네팅
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.45) / H) ** 2)
    arr *= (1 - 0.35 * np.clip(d - 0.2, 0, 1))[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


BG = make_bg()


# ---------------------------------------------------------------- text helpers
def rich_width(segs, f):
    return sum(f.getlength(s) for s, _ in segs)


def draw_rich(img, segs, f, cx, y, alpha=1.0, dy=0.0, anchor_center=True):
    """segs: [(text, color)], 가운데 정렬로 한 줄 그리기. 알파/슬라이드 지원."""
    if alpha <= 0:
        return None
    w = rich_width(segs, f)
    asc, desc = f.getmetrics()
    layer = Image.new("RGBA", (int(w) + 40, asc + desc + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 20
    boxes = {}
    for text, color in segs:
        d.text((x, 20), text, font=f, fill=color + (255,))
        boxes[text] = (x - 20, x - 20 + f.getlength(text))
        x += f.getlength(text)
    if alpha < 1:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer.putalpha(a)
    left = cx - w / 2 if anchor_center else cx
    img.alpha_composite(layer, (int(left - 20), int(y + dy - 20)))
    return left, boxes


def fade_line(img, t, start, segs, f, y, cx=W / 2, dur=0.45, rise=40, end=None, out_dur=0.3):
    p = ease_out(prog(t, start, dur))
    a = p
    if end is not None:
        a *= 1 - prog(t, end, out_dur)
    return draw_rich(img, segs, f, cx, y, alpha=a, dy=(1 - p) * rise)


def rounded(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


# ---------------------------------------------------------------- persistent title
def draw_title(img, t):
    a = ease_out(prog(t, 0.0, 0.6)) * (1 - prog(t, DURATION - 0.5, 0.5))
    layer = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    segs = [("몇 달 만의 연락은 ", WHITE), ("오히려 쉽다", ACCENT)]
    w = rich_width(segs, F_TITLE)
    pad_x = 36
    box = (W / 2 - w / 2 - pad_x, 40, W / 2 + w / 2 + pad_x, 40 + 92)
    rounded(d, box, 46, (255, 255, 255, 18), outline=(255, 255, 255, 40), width=2)
    x = W / 2 - w / 2
    for s, c in segs:
        d.text((x, 54), s, font=F_TITLE, fill=c + (255,))
        x += F_TITLE.getlength(s)
    tag = "INTP 연락 일기 · 2"
    d.text((W / 2 - F_SMALL.getlength(tag) / 2, 150), tag, font=F_SMALL, fill=DIM + (255,))
    if a < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(layer, (0, 120))


# ---------------------------------------------------------------- chat panel
PX0, PX1 = 90, 990
PY0, PY1 = 520, 1330
CHAT_MSG = "야, 이거 네가 잘 알지?"
TYPE1_START, TYPE1_END, SEND1 = 5.2, 6.5, 6.75
WHAT = ["뭐", "뭐해", "뭐해?"]


def typed_text(t):
    """입력창에 들어있는 텍스트 (장면 2·3)."""
    if t < TYPE1_START:
        return ""
    if t < SEND1:
        n = len(CHAT_MSG)
        k = int(round(n * prog(t, TYPE1_START, TYPE1_END - TYPE1_START)))
        return CHAT_MSG[:k]
    # 장면 3: "뭐해?" 썼다 지웠다
    def seq(start, hold_end, del_end):
        if t < start:
            return None
        if t < start + 0.6:
            k = min(3, int((t - start) / 0.2) + 1)
            return WHAT[k - 1]
        if t < hold_end:
            return "뭐해?"
        if t < del_end:
            k = 3 - int((t - hold_end) / ((del_end - hold_end) / 3))
            return WHAT[k - 1] if k > 0 else ""
        return ""

    for start, hold_end, del_end in [(13.6, 14.8, 15.2), (11.0, 12.5, 12.9)]:
        r = seq(start, hold_end, del_end)
        if r is not None:
            return r
    return ""


TYPING_EVENTS = (
    [TYPE1_START + i * (TYPE1_END - TYPE1_START) / len(CHAT_MSG) for i in range(len(CHAT_MSG))]
    + [11.0, 11.2, 11.4, 13.6, 13.8, 14.0]
)
DELETE_EVENTS = [12.5, 12.63, 12.76, 14.8, 14.93, 15.06]


def draw_bubble(d, img, text, right, y, color, tcolor, scale=1.0, alpha=1.0):
    tw = F_CHAT.getlength(text)
    bw, bh = tw + 64, 96
    if right:
        bx1 = PX1 - 40
        bx0 = bx1 - bw
    else:
        bx0 = PX0 + 130
        bx1 = bx0 + bw
    layer = Image.new("RGBA", (int(bw) + 20, bh + 20), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    rounded(ld, (10, 10, 10 + bw, 10 + bh), 36, color + (int(255 * alpha),))
    ld.text((10 + 32, 10 + 20), text, font=F_CHAT, fill=tcolor + (int(255 * alpha),))
    if scale != 1.0:
        nw, nh = max(1, int(layer.width * scale)), max(1, int(layer.height * scale))
        layer = layer.resize((nw, nh), Image.LANCZOS)
        ox = bx1 + 10 - nw if right else bx0 - 10
        oy = y + bh / 2 + 10 - nh / 2 - 10
    else:
        ox, oy = bx0 - 10, y - 10
    img.alpha_composite(layer, (int(ox), int(oy)))
    return bx0, bx1


def draw_chat(img, t, enter, leave):
    p_in = ease_out(prog(t, enter, 0.55))
    p_out = ease_in_out(prog(t, leave, 0.45))
    if p_in <= 0 or p_out >= 1:
        return
    a = p_in * (1 - p_out)
    off = (1 - p_in) * 120 + p_out * -80

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    y0, y1 = PY0 + off, PY1 + off
    # 그림자 + 패널
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((PX0, y0 + 24, PX1, y1 + 24), 48, fill=(0, 0, 0, 140))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    rounded(d, (PX0, y0, PX1, y1), 48, PANEL + (255,), outline=PANEL_LINE + (255,), width=2)

    # 헤더
    d.ellipse((PX0 + 40, y0 + 34, PX0 + 120, y0 + 114), fill=(92, 110, 160, 255))
    d.text((PX0 + 80 - F_NAME.getlength("J") / 2, y0 + 50), "J", font=F_NAME, fill=WHITE + (255,))
    d.text((PX0 + 145, y0 + 42), "대학 동기", font=F_NAME, fill=WHITE + (255,))
    d.text((PX0 + 145, y0 + 90), "마지막 대화 · 4개월 전", font=F_SMALL, fill=GRAY + (255,))
    d.line((PX0 + 30, y0 + 150, PX1 - 30, y0 + 150), fill=PANEL_LINE + (255,), width=2)

    # 날짜 구분선
    pill = "6월 3일"
    pw = F_SMALL.getlength(pill)
    rounded(d, (W / 2 - pw / 2 - 24, y0 + 180, W / 2 + pw / 2 + 24, y0 + 232), 26, (255, 255, 255, 14))
    d.text((W / 2 - pw / 2, y0 + 188), pill, font=F_SMALL, fill=GRAY + (255,))

    # 상대 아바타 + 옛날 메시지
    d.ellipse((PX0 + 40, y0 + 262, PX0 + 108, y0 + 330), fill=(92, 110, 160, 255))
    draw_bubble(d, layer, "ㅋㅋ 언제 밥 한번 먹자", False, y0 + 258, BUBBLE_THEM, WHITE)
    draw_bubble(d, layer, "ㅇㅇ 연락할게!", True, y0 + 378, BUBBLE_ME, (30, 30, 30))

    # 4개월 공백 표시
    gap_a = ease_out(prog(t, enter + 0.4, 0.5))
    if gap_a > 0:
        gtxt = "· · ·  4개월 동안 아무 연락 없음  · · ·"
        gw = F_SMALL.getlength(gtxt)
        d.text((W / 2 - gw / 2, y0 + 512), gtxt, font=F_SMALL, fill=mix(PANEL, RED, gap_a * 0.85) + (255,))

    # 보낸 메시지 (팝)
    if t >= SEND1:
        sp = prog(t, SEND1, 0.35)
        sc = 0.4 + 0.6 * ease_back(sp)
        draw_bubble(d, layer, CHAT_MSG, True, y0 + 580, BUBBLE_ME, (30, 30, 30), scale=sc, alpha=clamp(sp * 3))
        if sp >= 1:
            ts = "오후 2:14"
            d.text((PX1 - 40 - F_CHAT.getlength(CHAT_MSG) - 64 - F_SMALL.getlength(ts) - 14, y0 + 636),
                   ts, font=F_SMALL, fill=GRAY + (255,))

    # 입력창
    iy0, iy1 = y1 - 130, y1 - 36
    rounded(d, (PX0 + 30, iy0, PX1 - 140, iy1), 47, (40, 44, 56, 255))
    txt = typed_text(t)
    if txt:
        d.text((PX0 + 66, iy0 + 22), txt, font=F_CHAT, fill=WHITE + (255,))
    else:
        d.text((PX0 + 84, iy0 + 22), "메시지 입력", font=F_CHAT, fill=DIM + (255,))
    # 커서 깜빡임
    if t > enter + 0.5 and int(t * 2.2) % 2 == 0:
        cx = PX0 + 66 + (F_CHAT.getlength(txt) if txt else 0) + 4
        d.rectangle((cx, iy0 + 24, cx + 4, iy1 - 24), fill=ACCENT + (255,))
    # 전송 버튼
    send_on = bool(txt)
    sbx = (PX1 - 122, iy0 + 2, PX1 - 32, iy1 - 2)
    d.ellipse(sbx, fill=(BUBBLE_ME if send_on else (60, 64, 78)) + (255,))
    scx, scy = (sbx[0] + sbx[2]) / 2, (sbx[1] + sbx[3]) / 2
    d.polygon([(scx - 16, scy - 20), (scx + 22, scy), (scx - 16, scy + 20), (scx - 8, scy)],
              fill=((30, 30, 30) if send_on else (110, 114, 126)) + (255,))

    if a < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(layer)


# ---------------------------------------------------------------- scenes
def scene_hook(img, t):  # 0.0 – 4.6
    end = 4.3
    fade_line(img, t, 0.3, [("이상한 게,", GRAY)], F_MID, 640, end=end)
    fade_line(img, t, 1.0, [("몇 달 동안", ACCENT), (" 연락 안 한", WHITE)], F_BIG, 820, end=end)
    fade_line(img, t, 1.5, [("사람한테도", WHITE)], F_BIG, 940, end=end)
    fade_line(img, t, 2.4, [("갑자기 연락을 ", WHITE), ("잘합니다.", ACCENT)], F_BIG, 1120, end=end)


def caption_box(img, t, start, end, segs, f, y, dur=0.35):
    p = ease_out(prog(t, start, dur)) * (1 - prog(t, end, 0.3))
    if p <= 0:
        return
    w = rich_width(segs, f)
    layer = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rounded(d, (W / 2 - w / 2 - 40, 10, W / 2 + w / 2 + 40, 10 + f.size + 52), 28, (0, 0, 0, 170))
    x = W / 2 - w / 2
    for s, c in segs:
        d.text((x, 30), s, font=f, fill=c + (255,))
        x += f.getlength(s)
    layer.putalpha(layer.getchannel("A").point(lambda v: int(v * p)))
    img.alpha_composite(layer, (0, int(y + (1 - p) * 30)))


def scene_chat(img, t):  # 4.4 – 16.6
    draw_chat(img, t, enter=4.4, leave=16.3)
    # 장면 2 캡션
    caption_box(img, t, 4.8, 9.9, [("용건이 ", WHITE), ("있으면?", ACCENT)], F_CAP, 370)
    caption_box(img, t, 7.2, 9.9, [("→ 바로 보냄. ", WHITE), ("1초 컷", ACCENT)], F_CAP, 1390)
    # 장면 3 캡션
    caption_box(img, t, 10.1, 16.2, [("별 용건 ", WHITE), ("없이", RED), ("?", WHITE)], F_CAP, 370)
    caption_box(img, t, 12.6, 13.5, [("…", GRAY)], F_CAP, 1390)
    caption_box(img, t, 15.3, 16.2, [("\"뭐해?\"", ACCENT), ("는 못 보냄.", WHITE)], F_CAP, 1390)


def draw_strike(img, t, start, x0, x1, y, color=RED, thick=12):
    p = ease_in_out(prog(t, start, 0.4))
    if p <= 0:
        return
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x0 - 8, y - thick / 2, x0 - 8 + (x1 - x0 + 16) * p, y + thick / 2), radius=thick // 2,
                        fill=color + (255,))


def scene_twist(img, t):  # 16.6 – 21.6
    end = 21.3
    fade_line(img, t, 16.8, [("그래서 생각해보니까", GRAY)], F_MID, 640, end=end)
    fade_line(img, t, 17.8, [("제가 어려워했던 건", WHITE)], F_BIG, 830, end=end)
    r = fade_line(img, t, 18.7, [("연락", ACCENT), ("이 아니었습니다.", WHITE)], F_BIG, 960, end=end)
    if r and t < end:
        left, boxes = r
        bx0, bx1 = boxes["연락"]
        draw_strike(img, t, 19.8, left + bx0, left + bx1, 960 + 62)


def scene_end(img, t):  # 21.6 – 27.0
    end = DURATION - 0.5
    fade_line(img, t, 21.8, [("연락할 ", WHITE), ("이유", ACCENT), ("가", WHITE)], F_BIG, 760, end=end, out_dur=0.5)
    fade_line(img, t, 22.5, [("없는 상태", WHITE), ("가", WHITE)], F_BIG, 890, end=end, out_dur=0.5)
    fade_line(img, t, 23.3, [("어려웠습니다.", WHITE)], F_BIG, 1020, end=end, out_dur=0.5)
    # "이유" 밑줄 하이라이트
    p = ease_in_out(prog(t, 24.0, 0.5)) * (1 - prog(t, end, 0.5))
    if p > 0:
        segs = [("연락할 ", WHITE), ("이유", ACCENT), ("가", WHITE)]
        w = rich_width(segs, F_BIG)
        x0 = W / 2 - w / 2 + F_BIG.getlength("연락할 ")
        x1 = x0 + F_BIG.getlength("이유")
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle((x0 - 6, 760 + 92, x0 - 6 + (x1 - x0 + 12) * p, 760 + 108), 8,
                                                fill=ACCENT + (int(230 * (1 - prog(t, end, 0.5))),))
        img.alpha_composite(layer)
    fade_line(img, t, 25.0, [("용건이 있어야 움직이는 사람, 손.", GRAY)], F_SMALL, 1250, end=end, out_dur=0.5)


def render_frame(t):
    img = BG.copy().convert("RGBA")
    draw_title(img, t)
    if t < 4.8:
        scene_hook(img, t)
    if 4.2 < t < 17.0:
        scene_chat(img, t)
    if 16.5 < t < 21.8:
        scene_twist(img, t)
    if t > 21.5:
        scene_end(img, t)
    # 진행 바
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 8, W * t / DURATION, H), fill=ACCENT + (255,))
    return img.convert("RGB")


# ---------------------------------------------------------------- audio
def synth_audio(path):
    n = int(SR * DURATION)
    tt = np.arange(n) / SR
    out = np.zeros(n)

    # 잔잔한 패드 (Am7 - Fmaj7 - Cmaj7 - G6), 각 코드 ~6.75초
    chords = [
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 329.63],
        [130.81, 196.00, 246.94, 329.63],
        [196.00, 246.94, 293.66, 329.63],
    ]
    seg = DURATION / 4
    for i, ch in enumerate(chords):
        s, e = int(i * seg * SR), int((i + 1) * seg * SR)
        lt = tt[s:e] - tt[s]
        env = np.minimum(1, lt / 1.2) * np.minimum(1, (seg - lt) / 1.2)
        for f in ch:
            for det in (-0.6, 0.6):
                out[s:e] += 0.018 * env * np.sin(2 * np.pi * (f + det) * lt)
    # 부드러운 로우패스 느낌: 이동 평균
    k = 32
    out = np.convolve(out, np.ones(k) / k, mode="same")

    rng = np.random.default_rng(7)

    def add(at, sig):
        s = int(at * SR)
        e = min(n, s + len(sig))
        if s < n:
            out[s:e] += sig[: e - s]

    def click(vol=0.18, tone=2400):
        L = int(0.035 * SR)
        x = np.arange(L) / SR
        return vol * (rng.standard_normal(L) * 0.5 + np.sin(2 * np.pi * tone * x)) * np.exp(-x * 160)

    for at in TYPING_EVENTS:
        add(at, click(tone=rng.uniform(1800, 2600)))
    for at in DELETE_EVENTS:
        add(at, click(vol=0.14, tone=900))

    def pop(vol=0.4):
        L = int(0.18 * SR)
        x = np.arange(L) / SR
        f = 500 + 900 * np.exp(-x * 30)
        return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22)

    add(SEND1, pop())

    def whoosh(length=0.5, vol=0.12):
        L = int(length * SR)
        x = np.linspace(0, 1, L)
        noise = np.convolve(rng.standard_normal(L), np.ones(20) / 20, mode="same")
        return vol * noise * np.sin(np.pi * x) ** 2

    for at in (4.2, 16.4, 21.5):
        add(at, whoosh())

    def thud(vol=0.35):
        L = int(0.4 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * (90 + 60 * np.exp(-x * 20)) * x) * np.exp(-x * 9)

    add(19.8, thud())   # 취소선
    add(24.0, thud(0.25))  # 결론 밑줄

    # 페이드 인/아웃
    fade = np.minimum(1, tt / 0.5) * np.minimum(1, (DURATION - tt) / 0.8)
    out *= fade
    out = np.clip(out, -1, 1)
    data = (out * 32767).astype(np.int16)
    stereo = np.repeat(data[:, None], 2, axis=1)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())


# ---------------------------------------------------------------- main
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    wav = os.path.join(OUT_DIR, "bgm_sfx.wav")
    mp4 = os.path.join(OUT_DIR, "contact_reason.mp4")
    synth_audio(wav)

    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-i", wav,
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mp4],
        stdin=subprocess.PIPE,
    )
    total = int(DURATION * FPS)
    for i in range(total):
        proc.stdin.write(render_frame(i / FPS).tobytes())
        if i % 90 == 0:
            print(f"frame {i}/{total}")
    proc.stdin.close()
    proc.wait()

    # 썸네일용 스틸 몇 장
    for name, t in [("thumb_hook", 3.6), ("thumb_send", 8.5), ("thumb_typing", 14.2),
                    ("thumb_twist", 20.6), ("thumb_end", 25.8)]:
        render_frame(t).save(os.path.join(OUT_DIR, f"{name}.png"))
    print("done:", mp4)


if __name__ == "__main__":
    main()
