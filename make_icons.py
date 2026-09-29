import os
from PIL import Image, ImageDraw, ImageFont

BG_COLOR = (11, 18, 16, 255)        # --bg dark
DOC_COLOR = (245, 247, 244, 255)    # cream white
DOC_FOLD = (214, 222, 216, 255)     # folded corner shade
LINE_COLOR = (150, 168, 158, 255)   # text lines on the document
PENCIL_BODY = (251, 191, 36, 255)   # yellow
PENCIL_WOOD = (238, 217, 166, 255)
PENCIL_TIP = (63, 63, 70, 255)
PENCIL_FERRULE = (209, 213, 219, 255)
PENCIL_ERASER = (244, 114, 182, 255)
BAG_COLOR = (180, 131, 51, 255)     # money bag gold-brown
BAG_DARK = (140, 98, 33, 255)
BAG_DOLLAR = (245, 247, 244, 255)

MASTER = 512
CENTER = MASTER // 2

FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"


def draw_document(canvas):
    d = ImageDraw.Draw(canvas)
    x0, y0, x1, y1 = 141, 106, 351, 376
    fold = 34
    d.rounded_rectangle([x0, y0, x1, y1], radius=18, fill=DOC_COLOR)
    # folded top-right corner
    d.polygon([(x1 - fold, y0), (x1, y0 + fold), (x1, y0)], fill=DOC_FOLD)
    d.line([(x1 - fold, y0), (x1, y0 + fold)], fill=(200, 208, 202, 255), width=2)
    # text lines
    lines_y = [170, 200, 230, 260, 290]
    widths = [155, 155, 155, 130, 95]
    for y, w in zip(lines_y, widths):
        d.rounded_rectangle([x0 + 24, y, x0 + 24 + w, y + 14], radius=7, fill=LINE_COLOR)


def draw_pencil():
    w, h = 300, 90
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body_y0, body_y1 = 30, 60
    # wood taper + graphite tip on the left
    d.polygon([(40, body_y0), (0, 45), (40, body_y1)], fill=PENCIL_WOOD)
    d.polygon([(0, 45), (16, 40), (16, 50)], fill=PENCIL_TIP)
    # body
    d.rectangle([40, body_y0, 230, body_y1], fill=PENCIL_BODY)
    d.line([(40, body_y0 + 10), (230, body_y0 + 10)], fill=(217, 158, 14, 255), width=2)
    # ferrule + eraser
    d.rectangle([230, body_y0, 250, body_y1], fill=PENCIL_FERRULE)
    d.rounded_rectangle([250, body_y0 - 2, 292, body_y1 + 2], radius=10, fill=PENCIL_ERASER)
    return im


def draw_money_bag():
    size = 130
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = size // 2
    # tied neck
    d.rectangle([cx - 10, 18, cx + 10, 34], fill=BAG_DARK)
    d.ellipse([cx - 16, 8, cx + 16, 26], outline=BAG_DARK, width=6)
    # body (rounded sack shape)
    d.polygon(
        [
            (cx - 12, 30),
            (cx + 12, 30),
            (cx + 46, 70),
            (cx + 34, 114),
            (cx - 34, 114),
            (cx - 46, 70),
        ],
        fill=BAG_COLOR,
    )
    d.ellipse([cx - 46, 60, cx + 46, 122], fill=BAG_COLOR)
    d.ellipse([cx - 34, 96, cx + 34, 122], fill=BAG_DARK)
    # dollar sign
    font = ImageFont.truetype(FONT_PATH, 46)
    text = "$"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], 62 - th / 2 - bbox[1]), text, font=font, fill=BAG_DOLLAR)
    return im


def build_foreground():
    canvas = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    draw_document(canvas)

    pencil = draw_pencil().rotate(-38, expand=True, resample=Image.BICUBIC)
    px = CENTER - pencil.width // 2 + 6
    py = CENTER - pencil.height // 2 - 6
    canvas.alpha_composite(pencil, (px, py))

    bag = draw_money_bag()
    bx = 322
    by = 300
    canvas.alpha_composite(bag, (bx, by))

    # Shrink the whole composition toward the center so it stays inside the
    # adaptive-icon safe zone (~66% of the viewport) on circle/squircle masks.
    safe = int(MASTER * 0.74)
    shrunk = canvas.resize((safe, safe), Image.LANCZOS)
    safe_canvas = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    offset = (MASTER - safe) // 2
    safe_canvas.alpha_composite(shrunk, (offset, offset))
    return safe_canvas


def build_flat(foreground):
    flat = Image.new("RGBA", (MASTER, MASTER), BG_COLOR)
    flat.alpha_composite(foreground)
    return flat


def circle_crop(img):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def save_resized(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)


def main():
    foreground = build_foreground()
    flat = build_flat(foreground)
    round_flat = circle_crop(flat)

    root = os.path.dirname(os.path.abspath(__file__))
    res = os.path.join(root, "android", "app", "src", "main", "res")

    densities = {
        "mdpi": 1.0,
        "hdpi": 1.5,
        "xhdpi": 2.0,
        "xxhdpi": 3.0,
        "xxxhdpi": 4.0,
    }
    for name, scale in densities.items():
        d = os.path.join(res, f"mipmap-{name}")
        save_resized(foreground, os.path.join(d, "ic_launcher_foreground.png"), round(108 * scale))
        save_resized(flat, os.path.join(d, "ic_launcher.png"), round(48 * scale))
        save_resized(round_flat, os.path.join(d, "ic_launcher_round.png"), round(48 * scale))

    icons_dir = os.path.join(root, "icons")
    os.makedirs(icons_dir, exist_ok=True)
    save_resized(flat, os.path.join(icons_dir, "icon-192.png"), 192)
    save_resized(flat, os.path.join(icons_dir, "icon-512.png"), 512)

    print("done")


if __name__ == "__main__":
    main()
