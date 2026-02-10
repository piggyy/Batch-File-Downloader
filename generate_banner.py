"""Generate Chrome Web Store promotional banner (1400x560)"""
from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 1400, 560
img = Image.new('RGB', (W, H), '#1a1a2e')
draw = ImageDraw.Draw(img)

# --- Gradient background ---
for y in range(H):
    r = int(26 + (15 - 26) * y / H)
    g = int(26 + (52 - 26) * y / H)
    b = int(46 + (110 - 46) * y / H)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# --- Decorative circles (abstract tech feel) ---
circles = [
    (100, 80, 180, '#16213e', 40),
    (1300, 450, 220, '#16213e', 40),
    (1100, 100, 140, '#0f3460', 30),
    (250, 420, 160, '#0f3460', 30),
    (700, 500, 300, '#16213e', 25),
    (950, 300, 100, '#1a1a4e', 20),
]
for cx, cy, radius, color, alpha_pct in circles:
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    r2, g2, b2 = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    a = int(255 * alpha_pct / 100)
    od.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(r2, g2, b2, a))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

# --- Accent line decorations ---
for i in range(8):
    x = 50 + i * 180
    y1, y2 = 10, 10 + 40 + i * 5
    draw.line([(x, y1), (x, y2)], fill='#e94560', width=3)

for i in range(8):
    x = 100 + i * 180
    y1, y2 = H - 10, H - 10 - 40 - i * 5
    draw.line([(x, y1), (x, y2)], fill='#0ea5e9', width=3)

# --- Dotted grid pattern ---
for gx in range(0, W, 60):
    for gy in range(0, H, 60):
        dist = math.sqrt((gx - W/2)**2 + (gy - H/2)**2)
        if dist > 500:
            continue
        alpha = max(0, min(40, int(40 - dist / 15)))
        if alpha > 5:
            draw.ellipse([gx-1, gy-1, gx+1, gy+1], fill=(255, 255, 255, alpha))

# --- Download arrow icon (large, right side) ---
def draw_download_icon(draw, cx, cy, size, color):
    """Draw a stylized download arrow icon"""
    s = size
    # Arrow body (vertical bar)
    bar_w = s * 0.22
    draw.rectangle([cx - bar_w, cy - s*0.5, cx + bar_w, cy + s*0.1], fill=color)
    # Arrow head (triangle)
    draw.polygon([
        (cx - s*0.45, cy + s*0.05),
        (cx + s*0.45, cy + s*0.05),
        (cx, cy + s*0.5)
    ], fill=color)
    # Tray (bottom bar)
    tray_y = cy + s * 0.55
    draw.rectangle([cx - s*0.55, tray_y, cx + s*0.55, tray_y + s*0.08], fill=color)
    # Tray sides
    draw.rectangle([cx - s*0.55, tray_y - s*0.2, cx - s*0.55 + s*0.08, tray_y + s*0.08], fill=color)
    draw.rectangle([cx + s*0.55 - s*0.08, tray_y - s*0.2, cx + s*0.55, tray_y + s*0.08], fill=color)

draw_download_icon(draw, 1120, 260, 130, '#e94560')

# --- Multiple small file icons (stacked, representing batch) ---
def draw_file_icon(draw, x, y, w, h, color, fold_color):
    fold = w * 0.3
    # File body
    draw.polygon([
        (x, y), (x + w - fold, y), (x + w, y + fold), (x + w, y + h), (x, y + h)
    ], fill=color, outline=fold_color, width=1)
    # Fold triangle
    draw.polygon([
        (x + w - fold, y), (x + w, y + fold), (x + w - fold, y + fold)
    ], fill=fold_color)
    # Lines on file
    line_y = y + h * 0.35
    for i in range(3):
        ly = line_y + i * (h * 0.15)
        if ly < y + h - 8:
            draw.line([(x + 8, ly), (x + w - 12, ly)], fill=fold_color, width=2)

offsets = [(0, 0, '#3b82f6', '#1e40af'), (-20, -15, '#22c55e', '#15803d'), (-40, -30, '#f59e0b', '#b45309')]
for dx, dy, c, fc in reversed(offsets):
    draw_file_icon(draw, 1020 + dx, 120 + dy, 55, 70, c, fc)

# --- "x3" batch indicator ---
def get_font(size):
    """Try to load a good font, fall back to default"""
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                pass
    return ImageFont.load_default()

def get_bold_font(size):
    font_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                pass
    return ImageFont.load_default()

# --- Load extension icon if available ---
icon_path = os.path.join(os.path.dirname(__file__), 'Src', 'icons', 'icon128.png')
if os.path.exists(icon_path):
    icon = Image.open(icon_path).convert('RGBA').resize((100, 100), Image.LANCZOS)
    # Paste icon on the left side of the title
    img.paste(icon, (80, 170), icon)
    title_x = 200
else:
    title_x = 80

# --- Title text ---
title_font = get_bold_font(72)
draw.text((title_x, 175), "Batch File", fill='#ffffff', font=title_font)
draw.text((title_x, 260), "Downloader", fill='#e94560', font=title_font)

# --- Tagline ---
tag_font = get_font(28)
draw.text((title_x, 355), "Smart batch download files from any web page", fill='#94a3b8', font=tag_font)
draw.text((title_x, 392), "with anti-detection & stealth mode", fill='#94a3b8', font=tag_font)

# --- Feature pills ---
pill_font = get_font(18)
pills = ["20+ Sources", "22 Formats", "Anti-Hotlink", "Stealth Mode", "17 Languages"]
pill_colors = ['#e94560', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
px = title_x
py = 450
for i, (text, color) in enumerate(zip(pills, pill_colors)):
    bbox = draw.textbbox((0, 0), text, font=pill_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw, ph = tw + 24, th + 14
    # Pill background
    r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph//2, fill=(r_c, g_c, b_c, 200))
    # Pill text
    draw.text((px + 12, py + 5), text, fill='#ffffff', font=pill_font)
    px += pw + 12

# --- Chrome Web Store badge area ---
badge_font = get_font(16)
draw.text((title_x, 505), "Chrome Extension  ?  Manifest V3  ?  Free & Open Source", fill='#64748b', font=badge_font)

# --- Save as JPEG (no alpha) ---
out_path = os.path.join(os.path.dirname(__file__), 'promo_banner_1400x560.png')
img_rgb = img.convert('RGB')
img_rgb.save(out_path, 'PNG')
print(f"Banner saved to: {out_path}")
print(f"Size: {img_rgb.size}")
