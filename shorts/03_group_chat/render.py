"""3순위 숏츠 — 「사람이 더 많은데 왜 더 편하지?」 (역설형)

1080x1920 / 30fps / 약 44초 세로 영상을 렌더링한다.
의존성: Pillow, numpy, ffmpeg (PATH)

    python3 shorts/03_group_chat/render.py
    -> shorts/03_group_chat/out/group_chat.mp4
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
DURATION = 44.0
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



def draw_title(img, t):
    a = window(t, 0.0, DURATION - 0.5, 0.6, 0.5)
    layer = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    segs = [("사람이 더 많은데 ", WHITE), ("왜 더 편하지?", ACCENT)]
    w = rich_width(segs, F_TITLE)
    pad_x = 36
    rounded(d, (W / 2 - w / 2 - pad_x, 40, W / 2 + w / 2 + pad_x, 132), 46,
            (255, 255, 255, 18), outline=(255, 255, 255, 40), width=2)
    x = W / 2 - w / 2
    for s, c in segs:
        d.text((x, 54), s, font=F_TITLE, fill=c + (255,))
        x += F_TITLE.getlength(s)
    tag = "INTP 연락 일기 · 3"
    d.text((W / 2 - F_SMALL.getlength(tag) / 2, 150), tag, font=F_SMALL, fill=DIM + (255,))
    img.alpha_composite(set_alpha(layer, a), (0, 120))


F_CAP2 = font("Bold", 56)
F_GCHAT = font("Bold", 40)
F_GNAME = font("Medium", 28)

TOP_CAP_Y = 380
BOT_CAP_Y1, BOT_CAP_Y2 = 1350, 1450

MEMBERS = [("민", (92, 110, 160)), ("태", (196, 128, 150)), ("수", (110, 160, 130)), ("지", (170, 130, 90)),
           ("하", (130, 110, 180)), ("준", (90, 150, 170)), ("서", (180, 110, 110)), ("나", (80, 84, 98))]
COLORS = {k: c for k, c in MEMBERS}
NAMES = {"민": "민지", "태": "태호", "수": "수빈", "지": "지훈", "하": "하은", "준": "준영", "서": "서연"}


# ---------------------------------------------------------------- scene 1: 훅
def scene_hook(img, t):  # 0.0 – 4.6
    end = 4.3
    fade_line(img, t, 0.3, [("이상하게 저는", GRAY)], F_MID, 620, end=end)
    fade_line(img, t, 1.0, [("1:1 카톡보다", WHITE)], F_BIG, 780, end=end)
    fade_line(img, t, 1.8, [("사람 많은 ", WHITE), ("단톡방", ACCENT), ("이", WHITE)], F_BIG, 900, end=end)
    fade_line(img, t, 2.6, [("더 ", WHITE), ("편합니다.", ACCENT)], F_BIG, 1020, end=end)


# ---------------------------------------------------------------- scene 2: 사람이 많으면 신경 쓸 게 많을 것 같은데
def draw_avatar(d, cx, cy, r, letter, color, alpha=255, outline=None, f=None):
    f = f or F_NAME
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,),
              outline=(outline + (alpha,)) if outline else None, width=4 if outline else 0)
    d.text((cx - f.getlength(letter) / 2, cy - f.size * 0.62), letter, font=f, fill=WHITE + (alpha,))


def scene_paradox(img, t):  # 4.6 – 10.0
    end = 9.7
    fade_line(img, t, 4.8, [("생각해보면 좀 이상하잖아요.", GRAY)], F_MID, 560, end=end)
    a_end = 1 - prog(t, end, 0.3)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, (letter, color) in enumerate(MEMBERS):
        st = 5.6 + i * 0.22
        p = ease_back(prog(t, st, 0.3))
        if p <= 0:
            continue
        cx = W / 2 + (i - 3.5) * 112
        r = 46 * p
        draw_avatar(d, cx, 800, r, letter if p > 0.6 else "", color, alpha=int(255 * a_end),
                    outline=ACCENT if letter == "나" else None)
    n = min(8, max(0, int((t - 5.6) / 0.22) + 1)) if t >= 5.6 else 0
    if n:
        s = f"참여자 {n}명"
        d.text((W / 2 - F_SMALL.getlength(s) / 2, 870), s, font=F_SMALL, fill=GRAY + (int(255 * a_end),))
    img.alpha_composite(layer)
    fade_line(img, t, 6.8, [("사람이 많으면", WHITE)], F_BIG, 1000, end=end)
    fade_line(img, t, 7.5, [("더 ", WHITE), ("신경 쓸 것", ACCENT), ("도", WHITE)], F_BIG, 1120, end=end)
    fade_line(img, t, 8.2, [("많을 것 같은데.", WHITE)], F_BIG, 1240, end=end)


# ---------------------------------------------------------------- scene 3: 단톡방
PX0, PX1 = 90, 990
PY0, PY1 = 520, 1310
ME_LEAVES = 16.0
GROUP_MSGS = [
    (10.5, "민", "다들 주말에 뭐함"),
    (11.2, "태", "나 알바 ㅠㅠ"),
    (11.9, "수", "ㅋㅋㅋ 고생"),
    (12.7, "지", "이번주 모임 언제 됨?"),
    (13.9, "민", "토요일 7시!"),
    (14.5, "태", "ㅇㅋ"),
    (15.2, "수", "장소는 저번 거기?"),
    (ME_LEAVES, None, "나 님이 잠깐 사라졌습니다"),
    (16.6, "지", "ㅇㅇ 거기"),
    (17.2, "하", "ㅋㅋㅋㅋ 개좋아"),
    (17.8, "태", "근데 그거 봄?"),
    (18.3, "서", "봄 ㅋㅋㅋ 미쳤음"),
]
MSG_H, SYS_H = 132, 70


def panel_frame(t, enter, leave):
    p_in = ease_out(prog(t, enter, 0.55))
    p_out = ease_in_out(prog(t, leave, 0.45))
    if p_in <= 0 or p_out >= 1:
        return None
    a = p_in * (1 - p_out)
    off = (1 - p_in) * 120 - p_out * 80
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    y0, y1 = PY0 + off, PY1 + off
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((PX0, y0 + 24, PX1, y1 + 24), 48, fill=(0, 0, 0, 140))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    rounded(d, (PX0, y0, PX1, y1), 48, PANEL + (255,), outline=PANEL_LINE + (255,), width=2)
    d.line((PX0 + 30, y0 + 150, PX1 - 30, y0 + 150), fill=PANEL_LINE + (255,), width=2)
    return layer, d, y0, y1, a


def draw_input(d, y1, active=False, glow=0.0):
    iy0, iy1 = y1 - 120, y1 - 36
    rounded(d, (PX0 + 30, iy0, PX1 - 130, iy1), 42, (40, 44, 56, 255),
            outline=(ACCENT + (int(255 * glow),)) if glow > 0 else None, width=4 if glow > 0 else 0)
    d.text((PX0 + 70, iy0 + 18), "메시지 입력", font=F_GCHAT, fill=DIM + (255,))
    sbx = (PX1 - 114, iy0 + 2, PX1 - 32, iy1 - 2)
    d.ellipse(sbx, fill=(60, 64, 78, 255))
    scx, scy = (sbx[0] + sbx[2]) / 2, (sbx[1] + sbx[3]) / 2
    d.polygon([(scx - 14, scy - 18), (scx + 20, scy), (scx - 14, scy + 18), (scx - 7, scy)],
              fill=(110, 114, 126, 255))
    return iy0, iy1


def draw_group_msg(d, x, y, who, text, highlight=False):
    if who is None:
        tw = F_SMALL.getlength(text)
        rounded(d, (W / 2 - tw / 2 - 26, y + 8, W / 2 + tw / 2 + 26, y + 58), 25, (255, 255, 255, 16))
        d.text((W / 2 - tw / 2, y + 15), text, font=F_SMALL, fill=GRAY + (255,))
        return
    draw_avatar(d, x + 34, y + 62, 32, who, COLORS[who], f=F_GNAME)
    d.text((x + 84, y + 4), NAMES[who], font=F_GNAME, fill=GRAY + (255,))
    tw = F_GCHAT.getlength(text)
    bx0, by0 = x + 84, y + 42
    rounded(d, (bx0, by0, bx0 + tw + 56, by0 + 80), 32, BUBBLE_THEM + (255,),
            outline=(ACCENT + (255,)) if highlight else None, width=3 if highlight else 0)
    d.text((bx0 + 28, by0 + 16), text, font=F_GCHAT, fill=WHITE + (255,))


def scene_group(img, t):  # 10.0 – 19.2
    caption_box(img, t, 10.2, 18.9, [("근데 ", WHITE), ("단톡방", ACCENT), ("에서는", WHITE)], F_CAP, TOP_CAP_Y)
    fr = panel_frame(t, 10.0, 18.9)
    if fr:
        layer, d, y0, y1, a = fr
        # 헤더: 단톡방 이름 + 참여자 아바타
        d.text((PX0 + 40, y0 + 30), "주말 모임 단톡", font=F_NAME, fill=WHITE + (255,))
        d.text((PX0 + 40 + F_NAME.getlength("주말 모임 단톡 "), y0 + 34), "8", font=F_NAME, fill=GRAY + (255,))
        gone = ease_out(prog(t, ME_LEAVES, 0.5))
        status = "나: 잠깐 자리 비움" if gone > 0.5 else "나: 읽기만 하는 중"
        d.text((PX0 + 40, y0 + 88), status, font=F_SMALL, fill=mix(GRAY, ACCENT, 0.6) + (255,))
        for i, (letter, color) in enumerate(MEMBERS):
            cx = PX1 - 60 - (7 - i) * 46
            if letter == "나":
                al = int(255 * (1 - 0.75 * gone))
                draw_avatar(d, cx, y0 + 76, 24, letter, color, alpha=al, outline=ACCENT, f=F_GNAME)
            else:
                draw_avatar(d, cx, y0 + 76, 24, "", color)

        # 메시지 영역 (아래에서 위로 쌓이며 스크롤)
        ay0, ay1 = int(y0 + 152), int(y1 - 132)
        area = Image.new("RGBA", (W, ay1 - ay0), (0, 0, 0, 0))
        ad = ImageDraw.Draw(area)
        shown = [m for m in GROUP_MSGS if m[0] <= t]
        if shown:
            last_t = shown[-1][0]
            last_h = SYS_H if shown[-1][1] is None else MSG_H
            slide = (1 - ease_out(prog(t, last_t, 0.3))) * last_h
            y = area.height - 16 + slide
            for (mt, who, text) in reversed(shown):
                h = SYS_H if who is None else MSG_H
                y -= h
                if y + h < 0:
                    break
                draw_group_msg(ad, PX0 + 30, y, who, text, highlight=(mt == 13.9 and 13.5 <= t < 16.0))
        layer.alpha_composite(area, (0, ay0))
        draw_input(d, y1)
        img.alpha_composite(set_alpha(layer, a))

    caption_box(img, t, 10.8, 13.3, [("제가 ", WHITE), ("아무 말 안 해도", ACCENT), (" 됩니다.", WHITE)], F_CAP2,
                BOT_CAP_Y1)
    caption_box(img, t, 13.5, 15.9, [("답 안 해도 ", WHITE), ("누군가 대답", ACCENT), ("하고,", WHITE)], F_CAP2,
                BOT_CAP_Y1)
    caption_box(img, t, 16.2, 18.9, [("잠깐 사라져도 ", WHITE), ("대화는 계속", ACCENT), ("됩니다.", WHITE)], F_CAP2,
                BOT_CAP_Y1)


# ---------------------------------------------------------------- scene 4: 1:1
THEIR_MSG_AT = 19.9
MY_TURN_AT = 21.2
SILENCE_AT = 24.6
ELAPSED = [("1분", 24.6), ("10분", 25.0), ("1시간", 25.4), ("3일", 25.8)]
ENDED_AT = 26.4


def scene_dm(img, t):  # 19.0 – 28.6
    caption_box(img, t, 19.3, 28.3, [("근데 ", WHITE), ("1:1", ACCENT), ("은 다릅니다.", WHITE)], F_CAP, TOP_CAP_Y)
    fr = panel_frame(t, 19.1, 28.3)
    if fr:
        layer, d, y0, y1, a = fr
        draw_avatar(d, PX0 + 80, y0 + 74, 40, "J", (92, 110, 160))
        d.text((PX0 + 145, y0 + 42), "1:1 대화", font=F_NAME, fill=WHITE + (255,))
        d.text((PX0 + 145, y0 + 90), "참여자 2명 · 나 아니면 아무도 없음", font=F_SMALL, fill=GRAY + (255,))

        # 상대 메시지
        if t >= THEIR_MSG_AT:
            bub = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            bd = ImageDraw.Draw(bub)
            draw_avatar(bd, PX0 + 74, y0 + 250, 34, "J", (92, 110, 160), f=F_GNAME)
            place_bubble(layer, make_bubble("오늘 뭐 했어?", False, BUBBLE_THEM, WHITE), False, PX0 + 130,
                         y0 + 202, t, THEIR_MSG_AT)
            layer.alpha_composite(set_alpha(bub, clamp(prog(t, THEIR_MSG_AT, 0.2))))

        # 경과 시간
        if t >= SILENCE_AT:
            k = max(i for i, (_, st) in enumerate(ELAPSED) if st <= t)
            s = f"읽음 · {ELAPSED[k][0]} 전"
            d.text((PX0 + 130, y0 + 318), s, font=F_SMALL, fill=mix(GRAY, RED, k / 3) + (255,))

        # 내 차례 슬롯 (깜빡이는 빈 말풍선)
        slot_a = window(t, MY_TURN_AT, SILENCE_AT + 0.6, 0.4, 0.6)
        if slot_a > 0:
            pulse = 0.5 + 0.5 * np.sin((t - MY_TURN_AT) * 5)
            sx1, sy0 = PX1 - 40, y0 + 400
            label = "다음은 내 차례"
            lw = F_CHAT.getlength(label) + 64
            rounded(d, (sx1 - lw, sy0, sx1, sy0 + 96), 36, BUBBLE_ME + (int(40 * slot_a),),
                    outline=BUBBLE_ME + (int((140 + 115 * pulse) * slot_a),), width=4)
            d.text((sx1 - lw + 32, sy0 + 20), label, font=F_CHAT, fill=ACCENT + (int(255 * slot_a),))

        glow = window(t, MY_TURN_AT, SILENCE_AT, 0.4, 0.4) * (0.5 + 0.5 * np.sin((t - MY_TURN_AT) * 5))
        draw_input(d, y1, glow=glow)

        # 대화 종료
        ep = ease_out(prog(t, ENDED_AT, 0.5))
        if ep > 0:
            dim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(dim).rounded_rectangle((PX0, y0, PX1, y1), 48, fill=(8, 9, 12, int(150 * ep)))
            layer.alpha_composite(dim)
            msg = "대화가 여기서 끝났습니다"
            mw = F_CHAT.getlength(msg)
            d2 = ImageDraw.Draw(layer)
            ly = y0 + 500
            d2.line((PX0 + 50, ly + 30, W / 2 - mw / 2 - 24, ly + 30), fill=RED + (int(200 * ep),), width=3)
            d2.line((W / 2 + mw / 2 + 24, ly + 30, PX1 - 50, ly + 30), fill=RED + (int(200 * ep),), width=3)
            d2.text((W / 2 - mw / 2, ly), msg, font=F_CHAT, fill=RED + (int(255 * ep),))
        img.alpha_composite(set_alpha(layer, a))

    caption_box(img, t, 20.4, 24.3, [("상대가 말하면", WHITE)], F_CAP2, BOT_CAP_Y1)
    caption_box(img, t, 21.2, 24.3, [("다음은 ", WHITE), ("제 차례", ACCENT), ("입니다.", WHITE)], F_CAP2, BOT_CAP_Y2)
    caption_box(img, t, 24.6, 28.3, [("제가 답을 안 하면", WHITE)], F_CAP2, BOT_CAP_Y1)
    caption_box(img, t, 25.4, 28.3, [("대화가 ", WHITE), ("끝나버리니까요.", RED)], F_CAP2, BOT_CAP_Y2)


# ---------------------------------------------------------------- scene 5: 반전
def scene_twist(img, t):  # 28.6 – 34.6
    end = 34.3
    fade_line(img, t, 28.8, [("그래서", GRAY)], F_MID, 600, end=end)
    r = fade_line(img, t, 29.3, [("사람 수", WHITE), ("가 문제인 줄", WHITE)], F_BIG, 760, end=end)
    fade_line(img, t, 29.9, [("알았는데,", WHITE)], F_BIG, 880, end=end)
    if r and t < end + 0.3:
        draw_strike(img, t, 30.8, r[0][0], r[0][1], 760 + 60, alpha=1 - prog(t, end, 0.3))
    fade_line(img, t, 31.6, [("오히려", ACCENT)], F_BIG, 1060, end=end)
    fade_line(img, t, 32.2, [("반대였던 것 같습니다.", WHITE)], F_BIG, 1180, end=end)


# ---------------------------------------------------------------- scene 6: 결론
STRIKE_AT, UNDERLINE_AT = 37.0, 41.4


def scene_end(img, t):  # 34.6 – 44.0
    # 첫 문장: 사람이 부담스러운 게 아니었던 것 같습니다.
    e1 = 38.4
    fade_line(img, t, 34.8, [("그래서", GRAY)], F_MID, 640, end=e1)
    r = fade_line(img, t, 35.3, [("사람", WHITE), ("이 부담스러운 게", WHITE)], F_BIG, 790, end=e1)
    fade_line(img, t, 36.0, [("아니었던 것 같습니다.", WHITE)], F_BIG, 910, end=e1)
    if r and t < e1 + 0.3:
        draw_strike(img, t, STRIKE_AT, r[0][0], r[0][1], 790 + 60, alpha=1 - prog(t, e1, 0.3))

    # 둘째 문장: 내가 이 대화를 계속 이어가야 한다는 느낌이 부담스러웠던 거죠.
    end = DURATION - 0.5
    fade_line(img, t, 38.8, [("내가 이 대화를", WHITE)], F_BIG, 720, end=end, out_dur=0.5)
    r2 = fade_line(img, t, 39.4, [("계속 이어가야", ACCENT)], F_BIG, 840, end=end, out_dur=0.5)
    fade_line(img, t, 40.0, [("한다는 느낌이", WHITE)], F_BIG, 960, end=end, out_dur=0.5)
    fade_line(img, t, 40.6, [("부담스러웠던 거죠.", WHITE)], F_BIG, 1080, end=end, out_dur=0.5)
    p = ease_in_out(prog(t, UNDERLINE_AT, 0.5)) * (1 - prog(t, end, 0.5))
    if r2 and p > 0:
        x0, x1 = r2[0]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle((x0 - 6, 840 + 92, x0 - 6 + (x1 - x0 + 12) * p, 840 + 106), 7,
                                                fill=ACCENT + (230,))
        img.alpha_composite(layer)
    fade_line(img, t, 42.0, [("단톡방에선 눈팅 전문인 사람, 댓글로 손.", GRAY)], F_SMALL, 1280, end=end, out_dur=0.5)


def render_frame(t):
    img = BG.copy().convert("RGBA")
    draw_title(img, t)
    if t < 4.8:
        scene_hook(img, t)
    if 4.6 < t < 10.1:
        scene_paradox(img, t)
    if 9.9 < t < 19.5:
        scene_group(img, t)
    if 19.0 < t < 28.9:
        scene_dm(img, t)
    if 28.6 < t < 34.7:
        scene_twist(img, t)
    if t > 34.6:
        scene_end(img, t)
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 8, W * t / DURATION, H), fill=ACCENT + (255,))
    return img.convert("RGB")


# ---------------------------------------------------------------- audio
def synth_audio(path):
    n = int(SR * DURATION)
    tt = np.arange(n) / SR
    out = np.zeros(n)

    # 잔잔한 패드 (Cmaj7 - Am7 - Fmaj7 - G6 - Em7 - Fmaj7)
    chords = [
        [130.81, 196.00, 246.94, 329.63],
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 329.63],
        [196.00, 246.94, 293.66, 329.63],
        [164.81, 196.00, 246.94, 293.66],
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

    rng = np.random.default_rng(3)

    def add(at, sig):
        s = int(at * SR)
        e = min(n, s + len(sig))
        if s < n:
            out[s:e] += sig[: e - s]

    def pop(vol=0.25, base=500):
        L = int(0.18 * SR)
        x = np.arange(L) / SR
        f = base + 900 * np.exp(-x * 30)
        return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22)

    def whoosh(length=0.5, vol=0.12):
        L = int(length * SR)
        x = np.linspace(0, 1, L)
        noise = np.convolve(rng.standard_normal(L), np.ones(20) / 20, mode="same")
        return vol * noise * np.sin(np.pi * x) ** 2

    def thud(vol=0.3, base=90):
        L = int(0.4 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * (base + 60 * np.exp(-x * 20)) * x) * np.exp(-x * 9)

    def tick(vol=0.15):
        L = int(0.06 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * 1300 * x) * np.exp(-x * 70)

    def ping(vol=0.18, f=880):
        L = int(0.5 * SR)
        x = np.arange(L) / SR
        return vol * np.sin(2 * np.pi * f * x) * np.exp(-x * 6)

    for at in (4.5, 10.0, 19.0, 28.5, 34.5, 38.6):
        add(at, whoosh())
    for i in range(len(MEMBERS)):
        add(5.6 + i * 0.22, pop(0.12, base=400 + i * 40))
    for mt, who, _ in GROUP_MSGS:
        add(mt, pop(0.2, base=rng.uniform(450, 650)) if who else ping(0.12, 520))
    add(THEIR_MSG_AT, pop(0.3))
    add(MY_TURN_AT, ping(0.16, 988))
    for _, st in ELAPSED:
        add(st, tick())
    add(ENDED_AT, thud(0.35, base=70))
    add(30.8, thud(0.25))
    add(STRIKE_AT, thud(0.25))
    add(UNDERLINE_AT, thud(0.22))

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
    mp4 = os.path.join(OUT_DIR, "group_chat.mp4")
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
        if i % 150 == 0:
            print(f"frame {i}/{total}")
    proc.stdin.close()
    proc.wait()

    for name, t in [("thumb_hook", 3.8), ("thumb_group", 18.6), ("thumb_dm", 23.5), ("thumb_ended", 27.8),
                    ("thumb_end", 43.0)]:
        render_frame(t).save(os.path.join(OUT_DIR, f"{name}.png"))
    print("done:", mp4)


if __name__ == "__main__":
    main()
