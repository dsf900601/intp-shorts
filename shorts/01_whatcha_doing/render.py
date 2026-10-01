"""1순위 숏츠 — 「"뭐해?"까지 썼다가 지우는 사람」

1080x1920 / 30fps / 약 32초 세로 영상을 렌더링한다.
의존성: Pillow, numpy, ffmpeg (PATH)

    python3 shorts/01_whatcha_doing/render.py
    -> shorts/01_whatcha_doing/out/whatcha_doing.mp4
"""
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
DURATION = 32.0
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
INK = (30, 30, 30)


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Pretendard-{weight}.otf"), size)


F_TITLE = font("ExtraBold", 50)
F_HUGE = font("ExtraBold", 150)
F_BIG = font("ExtraBold", 88)
F_MID = font("Bold", 72)
F_CAP = font("Bold", 62)
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


def window(t, start, end, fin=0.45, fout=0.3):
    """start에 나타나서 end에 사라지는 알파 (0~1)."""
    return ease_out(prog(t, start, fin)) * (1 - prog(t, end, fout))


# ---------------------------------------------------------------- background
def make_bg():
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array(BG_TOP), np.array(BG_BOT)
    arr = (top * (1 - y) + bot * y) * np.ones((1, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.45) / H) ** 2)
    arr *= (1 - 0.35 * np.clip(d - 0.2, 0, 1))[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


BG = make_bg()


# ---------------------------------------------------------------- drawing helpers
def set_alpha(layer, a):
    if a < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    return layer


def rich_width(segs, f):
    return sum(f.getlength(s) for s, _ in segs)


def draw_rich(img, segs, f, cx, y, alpha=1.0, dy=0.0):
    """segs: [(text, color)] 를 가운데 정렬로 한 줄 그린다. 각 조각의 x 범위를 돌려준다."""
    if alpha <= 0:
        return None
    w = rich_width(segs, f)
    asc, desc = f.getmetrics()
    layer = Image.new("RGBA", (int(w) + 40, asc + desc + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 20
    boxes = []
    left = cx - w / 2
    for text, color in segs:
        d.text((x, 20), text, font=f, fill=color + (255,))
        boxes.append((left + x - 20, left + x - 20 + f.getlength(text)))
        x += f.getlength(text)
    img.alpha_composite(set_alpha(layer, alpha), (int(left - 20), int(y + dy - 20)))
    return boxes


def fade_line(img, t, start, segs, f, y, end=None, dur=0.45, rise=40, out_dur=0.3):
    p = ease_out(prog(t, start, dur))
    a = p * (1 - prog(t, end, out_dur)) if end is not None else p
    return draw_rich(img, segs, f, W / 2, y, alpha=a, dy=(1 - p) * rise)


def rounded(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def caption_box(img, t, start, end, segs, f, y):
    p = window(t, start, end, 0.35)
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
    img.alpha_composite(set_alpha(layer, p), (0, int(y + (1 - p) * 30)))


def draw_strike(img, t, start, x0, x1, y, color=RED, thick=10, alpha=1.0):
    p = ease_in_out(prog(t, start, 0.3))
    if p <= 0 or alpha <= 0:
        return
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        (x0 - 8, y - thick / 2, x0 - 8 + (x1 - x0 + 16) * p, y + thick / 2), radius=thick // 2,
        fill=color + (int(255 * alpha),))
    img.alpha_composite(layer)


def draw_title(img, t):
    a = window(t, 0.0, DURATION - 0.5, 0.6, 0.5)
    layer = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    segs = [("\"뭐해?\"", ACCENT), ("까지 썼다가 지우는 사람", WHITE)]
    w = rich_width(segs, F_TITLE)
    pad_x = 36
    rounded(d, (W / 2 - w / 2 - pad_x, 40, W / 2 + w / 2 + pad_x, 132), 46,
            (255, 255, 255, 18), outline=(255, 255, 255, 40), width=2)
    x = W / 2 - w / 2
    for s, c in segs:
        d.text((x, 54), s, font=F_TITLE, fill=c + (255,))
        x += F_TITLE.getlength(s)
    tag = "INTP 연락 일기 · 1"
    d.text((W / 2 - F_SMALL.getlength(tag) / 2, 150), tag, font=F_SMALL, fill=DIM + (255,))
    img.alpha_composite(set_alpha(layer, a), (0, 120))


def make_bubble(text, right, color, tcolor, imagined=False):
    tw = F_CHAT.getlength(text)
    bw, bh = int(tw + 64), 96
    layer = Image.new("RGBA", (bw + 20, bh + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if imagined:
        # 상상 속 말풍선: 반투명 + 얇은 테두리
        rounded(d, (10, 10, 10 + bw, 10 + bh), 36, color + (70,), outline=color + (210,), width=3)
        tcolor = WHITE
    else:
        rounded(d, (10, 10, 10 + bw, 10 + bh), 36, color + (255,))
    d.text((10 + 32, 10 + 20), text, font=F_CHAT, fill=tcolor + (255,))
    return layer


def place_bubble(img, layer, right, x_edge, y, t, start, alpha=1.0):
    """start 시점에 튀어나오는 말풍선. x_edge: 오른쪽 말풍선이면 오른쪽 끝, 왼쪽이면 왼쪽 끝."""
    sp = prog(t, start, 0.35)
    if sp <= 0 or alpha <= 0:
        return None
    sc = 0.4 + 0.6 * ease_back(sp)
    lw, lh = layer.size
    nw, nh = max(1, int(lw * sc)), max(1, int(lh * sc))
    lay = layer.resize((nw, nh), Image.LANCZOS) if sc != 1 else layer.copy()
    ox = x_edge + 10 - nw if right else x_edge - 10
    oy = y + lh / 2 - 10 - nh / 2
    img.alpha_composite(set_alpha(lay, clamp(sp * 3) * alpha), (int(ox), int(oy)))
    x0 = x_edge - (lw - 20) if right else x_edge
    return x0, x0 + lw - 20


# ---------------------------------------------------------------- scene 1: 채팅창 열고 "뭐해?" 썼다 지우기
PX0, PX1 = 90, 990
PY0, PY1 = 560, 1320
TYPE_START, HOLD_END, DEL_END = 4.2, 6.6, 7.0
WHAT = ["뭐", "뭐해", "뭐해?"]
TYPING_EVENTS = [4.2, 4.42, 4.64]
DELETE_EVENTS = [6.6, 6.73, 6.86]


def typed(t):
    if t < TYPE_START:
        return ""
    if t < TYPE_START + 0.66:
        return WHAT[min(2, int((t - TYPE_START) / 0.22))]
    if t < HOLD_END:
        return "뭐해?"
    if t < DEL_END:
        k = 3 - int((t - HOLD_END) / ((DEL_END - HOLD_END) / 3))
        return WHAT[k - 1] if k > 0 else ""
    return ""


def draw_chat(img, t, enter, leave):
    p_in = ease_out(prog(t, enter, 0.55))
    p_out = ease_in_out(prog(t, leave, 0.45))
    if p_in <= 0 or p_out >= 1:
        return
    a = p_in * (1 - p_out)
    off = (1 - p_in) * 120 - p_out * 80
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    y0, y1 = PY0 + off, PY1 + off

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((PX0, y0 + 24, PX1, y1 + 24), 48, fill=(0, 0, 0, 140))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    rounded(d, (PX0, y0, PX1, y1), 48, PANEL + (255,), outline=PANEL_LINE + (255,), width=2)

    # 헤더
    d.ellipse((PX0 + 40, y0 + 34, PX0 + 120, y0 + 114), fill=(196, 128, 150, 255))
    d.text((PX0 + 80 - F_NAME.getlength("S") / 2, y0 + 50), "S", font=F_NAME, fill=WHITE + (255,))
    d.text((PX0 + 145, y0 + 42), "요즘 친해지고 싶은 사람", font=F_NAME, fill=WHITE + (255,))
    d.text((PX0 + 145, y0 + 90), "대화 내역 없음", font=F_SMALL, fill=GRAY + (255,))
    d.line((PX0 + 30, y0 + 150, PX1 - 30, y0 + 150), fill=PANEL_LINE + (255,), width=2)

    # 텅 빈 대화창
    empty = "아직 주고받은 메시지가 없어요"
    d.text((W / 2 - F_SMALL.getlength(empty) / 2, y0 + 330), empty, font=F_SMALL, fill=DIM + (255,))

    # 입력창
    iy0, iy1 = y1 - 130, y1 - 36
    rounded(d, (PX0 + 30, iy0, PX1 - 140, iy1), 47, (40, 44, 56, 255))
    txt = typed(t)
    if txt:
        d.text((PX0 + 66, iy0 + 22), txt, font=F_CHAT, fill=WHITE + (255,))
    else:
        d.text((PX0 + 84, iy0 + 22), "메시지 입력", font=F_CHAT, fill=DIM + (255,))
    if t > enter + 0.5 and int(t * 2.2) % 2 == 0:
        cx = PX0 + 66 + (F_CHAT.getlength(txt) if txt else 0) + 4
        d.rectangle((cx, iy0 + 24, cx + 4, iy1 - 24), fill=ACCENT + (255,))
    send_on = bool(txt)
    sbx = (PX1 - 122, iy0 + 2, PX1 - 32, iy1 - 2)
    d.ellipse(sbx, fill=(BUBBLE_ME if send_on else (60, 64, 78)) + (255,))
    scx, scy = (sbx[0] + sbx[2]) / 2, (sbx[1] + sbx[3]) / 2
    d.polygon([(scx - 16, scy - 20), (scx + 22, scy), (scx - 16, scy + 20), (scx - 8, scy)],
              fill=(INK if send_on else (110, 114, 126)) + (255,))

    # "뭐해?" 를 쓰고 멈춰 있는 동안: 손가락이 전송 버튼 위에서 망설이는 링
    hp = prog(t, 5.2, 1.3)
    if 0 < hp < 1 and send_on:
        r = 56 + 10 * np.sin(hp * np.pi * 4)
        d.ellipse((scx - r, scy - r, scx + r, scy + r), outline=ACCENT + (int(200 * (1 - hp * 0.6)),), width=4)

    img.alpha_composite(set_alpha(layer, a))


def scene_open(img, t):  # 0.0 – 8.6
    caption_box(img, t, 0.3, 8.3, [("친해지고 싶은 사람", ACCENT), ("이 생기면", WHITE)], F_CAP, 380)
    draw_chat(img, t, enter=1.6, leave=8.2)
    caption_box(img, t, 2.3, 4.0, [("카톡창을 엽니다.", WHITE)], F_CAP, 1380)
    caption_box(img, t, 4.3, 6.4, [("\"뭐해?\"", ACCENT), ("까지 써요.", WHITE)], F_CAP, 1380)
    caption_box(img, t, 6.7, 8.3, [("그리고 ", WHITE), ("지웁니다.", RED)], F_CAP, 1380)


# ---------------------------------------------------------------- scene 2: 머릿속 시뮬레이션
SIM_X0, SIM_X1 = 110, 970
CANDIDATES = [("오 뭐하는데?", 13.2), ("나도 ㅋㅋ", 13.7), ("밥은 먹었어?", 14.2)]


def scene_sim(img, t):  # 8.6 – 18.0
    end = 17.7
    caption_box(img, t, 8.7, end, [("왜냐하면 갑자기", WHITE)], F_CAP, 380)

    # 상상 영역 프레임
    fa = window(t, 9.2, end)
    if fa > 0:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        rounded(d, (SIM_X0 - 20, 560, SIM_X1 + 20, 1330), 48, (255, 255, 255, 10),
                outline=(255, 255, 255, 50), width=2)
        lab = "머릿속 시뮬레이션 중…"
        lw = F_SMALL.getlength(lab)
        rounded(d, (W / 2 - lw / 2 - 26, 536, W / 2 + lw / 2 + 26, 588), 26, (40, 44, 56, 255))
        d.text((W / 2 - lw / 2, 543), lab, font=F_SMALL, fill=GRAY + (255,))
        img.alpha_composite(set_alpha(layer, fa))

    a = 1 - prog(t, end, 0.3)
    place_bubble(img, make_bubble("뭐해?", True, BUBBLE_ME, INK, imagined=True), True, SIM_X1 - 20, 640, t, 9.7, a)
    place_bubble(img, make_bubble("그냥 집에 있어 ㅎㅎ", False, BUBBLE_THEM, WHITE), False, SIM_X0 + 20, 770, t,
                 10.6, a)

    # "그다음엔...?" 생각 중 말풍선 (점 세 개가 깜빡)
    if t >= 11.5:
        dots = "." * (1 + int((t - 11.5) * 3) % 3)
        place_bubble(img, make_bubble(f"{dots:<3}", True, BUBBLE_ME, INK, imagined=True), True, SIM_X1 - 20, 900, t,
                     11.5, a * (1 - prog(t, 12.9, 0.25)))

    # 후보 답장들이 떴다가 차례로 X
    for i, (txt, st) in enumerate(CANDIDATES):
        y = 900 + i * 120
        r = place_bubble(img, make_bubble(txt, True, BUBBLE_ME, INK, imagined=True), True, SIM_X1 - 20, y, t, st,
                         a * (1 - 0.55 * prog(t, st + 1.6, 0.3)))
        if r:
            draw_strike(img, t, st + 1.6, r[0] + 14, r[1] - 14, y + 48, alpha=a)

    caption_box(img, t, 15.4, end, [("\"그다음엔 ", WHITE), ("뭐라고 하지?", ACCENT), ("\"", WHITE)], F_CAP, 1380)


# ---------------------------------------------------------------- scene 3: 몇 달 후
def scene_later(img, t):  # 17.8 – 23.2
    end = 22.9
    fade_line(img, t, 18.0, [("→ 몇 달 후", GRAY)], F_MID, 560, end=end)
    # 달력 숫자 넘어가기
    if 18.4 <= t < end + 0.3:
        months = ["1개월", "2개월", "3개월", "5개월"]
        k = min(len(months) - 1, int((t - 18.4) / 0.35))
        a = window(t, 18.4, end, 0.25)
        draw_rich(img, [(months[k], ACCENT if k == len(months) - 1 else WHITE)], F_HUGE, W / 2, 700, alpha=a)
    fade_line(img, t, 20.2, [("\"아, 걔랑", WHITE)], F_BIG, 1010, end=end)
    fade_line(img, t, 20.7, [("친해지고 싶었는데.\"", WHITE)], F_BIG, 1130, end=end)
    fade_line(img, t, 21.4, [("(그 사이 연락 0회)", DIM)], F_SMALL, 1290, end=end)


# ---------------------------------------------------------------- scene 4: 결론
def scene_end(img, t):  # 23.0 – 32.0
    e1 = 26.6
    fade_line(img, t, 23.2, [("친해지고 싶은 마음이", WHITE)], F_BIG, 760, end=e1)
    r = fade_line(img, t, 24.0, [("없었던", GRAY), (" 게 아니라,", WHITE)], F_BIG, 890, end=e1)
    if r and t < e1 + 0.3:
        draw_strike(img, t, 25.0, r[0][0], r[0][1], 890 + 60, alpha=1 - prog(t, e1, 0.3))

    end = DURATION - 0.5
    fade_line(img, t, 27.0, [("대화를 시작하면", WHITE)], F_BIG, 700, end=end, out_dur=0.5)
    r = fade_line(img, t, 27.8, [("그다음까지", ACCENT), (" 책임져야", WHITE)], F_BIG, 830, end=end, out_dur=0.5)
    fade_line(img, t, 28.6, [("할 것 같았던 것 같다.", WHITE)], F_BIG, 960, end=end, out_dur=0.5)
    # "그다음까지" 밑줄
    p = ease_in_out(prog(t, 29.4, 0.5)) * (1 - prog(t, end, 0.5))
    if r and p > 0:
        x0, x1 = r[0]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle((x0 - 6, 830 + 92, x0 - 6 + (x1 - x0 + 12) * p, 830 + 106), 7,
                                                fill=ACCENT + (230,))
        img.alpha_composite(set_alpha(layer, 1 - prog(t, end, 0.5)))
    fade_line(img, t, 30.0, [("오늘도 \"뭐해?\" 지운 사람, 댓글로 손.", GRAY)], F_SMALL, 1200, end=end, out_dur=0.5)


def render_frame(t):
    img = BG.copy().convert("RGBA")
    draw_title(img, t)
    if t < 8.8:
        scene_open(img, t)
    if 8.5 < t < 18.1:
        scene_sim(img, t)
    if 17.9 < t < 23.3:
        scene_later(img, t)
    if t > 23.0:
        scene_end(img, t)
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 8, W * t / DURATION, H), fill=ACCENT + (255,))
    return img.convert("RGB")


# ---------------------------------------------------------------- audio
def synth_audio(path):
    n = int(SR * DURATION)
    tt = np.arange(n) / SR
    out = np.zeros(n)

    # 잔잔한 패드 (Fmaj7 - Em7 - Dm7 - Cmaj7 / 마지막은 Fmaj7 로 여운)
    chords = [
        [174.61, 220.00, 261.63, 329.63],
        [164.81, 196.00, 246.94, 293.66],
        [146.83, 174.61, 220.00, 261.63],
        [130.81, 196.00, 246.94, 329.63],
        [174.61, 220.00, 261.63, 329.63],
    ]
    seg = DURATION / len(chords)
    for i, ch in enumerate(chords):
        s, e = int(i * seg * SR), int((i + 1) * seg * SR)
        lt = tt[s:e] - tt[s]
        env = np.minimum(1, lt / 1.2) * np.minimum(1, (seg - lt) / 1.2)
        for f in ch:
            for det in (-0.6, 0.6):
                out[s:e] += 0.018 * env * np.sin(2 * np.pi * (f + det) * lt)
    out = np.convolve(out, np.ones(32) / 32, mode="same")

    rng = np.random.default_rng(11)

    def add(at, sig):
        s = int(at * SR)
        e = min(n, s + len(sig))
        if s < n:
            out[s:e] += sig[: e - s]

    def click(vol=0.18, tone=2400):
        L = int(0.035 * SR)
        x = np.arange(L) / SR
        return vol * (rng.standard_normal(L) * 0.5 + np.sin(2 * np.pi * tone * x)) * np.exp(-x * 160)

    def pop(vol=0.3, base=500):
        L = int(0.18 * SR)
        x = np.arange(L) / SR
        f = base + 900 * np.exp(-x * 30)
        return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22)

    def whoosh(length=0.5, vol=0.12):
        L = int(length * SR)
        x = np.linspace(0, 1, L)
        noise = np.convolve(rng.standard_normal(L), np.ones(20) / 20, mode="same")
        return vol * noise * np.sin(np.pi * x) ** 2

    def thud(vol=0.3):
        L = int(0.4 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * (90 + 60 * np.exp(-x * 20)) * x) * np.exp(-x * 9)

    def tick(vol=0.15):
        L = int(0.06 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * 1300 * x) * np.exp(-x * 70)

    for at in TYPING_EVENTS:
        add(at, click(tone=rng.uniform(1800, 2600)))
    for at in DELETE_EVENTS:
        add(at, click(vol=0.14, tone=900))
    for at in (1.6, 8.5, 17.9, 26.8):
        add(at, whoosh())
    # 상상 말풍선 팝
    for at in (9.7, 10.6, 11.5) + tuple(st for _, st in CANDIDATES):
        add(at, pop(0.22, base=rng.uniform(450, 650)))
    for _, st in CANDIDATES:
        add(st + 1.6, click(vol=0.2, tone=700))
    # 달 넘어가는 소리
    for i in range(4):
        add(18.4 + i * 0.35, tick())
    add(25.0, thud(0.25))
    add(29.4, thud(0.25))

    out *= np.minimum(1, tt / 0.5) * np.minimum(1, (DURATION - tt) / 0.8)
    data = (np.clip(out, -1, 1) * 32767).astype(np.int16)
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
    mp4 = os.path.join(OUT_DIR, "whatcha_doing.mp4")
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

    for name, t in [("thumb_typed", 5.8), ("thumb_sim", 16.5), ("thumb_later", 22.2), ("thumb_end", 30.6)]:
        render_frame(t).save(os.path.join(OUT_DIR, f"{name}.png"))
    print("done:", mp4)


if __name__ == "__main__":
    main()
