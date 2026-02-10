"""Generate Chrome Web Store small promotional tile (440x280)"""
from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 440, 280
img = Image.new('RGB', (W, H), '#1a1a2e')
draw = ImageDraw.Draw(img)

# --- Gradient background ---
for y in range(H):
    r = int(26 + (15 - 26) * y / H)
    g = int(26 + (52 - 26) * y / H)
    b = int(46 + (110 - 46) * y / H)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# --- Decorative circles ---
circles = [
    (30, 20, 80, '#16213e', 40),
    (410, 250, 100, '#16213e', 40),
    (350, 50, 70, '#0f3460', 30),
    (80, 230, 60, '#0f3460', 30),
]
for cx, cy, radius, color, alpha_pct in circles:
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    r2, g2, b2 = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    a = int(255 * alpha_pct / 100)
    od.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(r2, g2, b2, a))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

# --- Accent lines ---
for i in range(5):
    x = 20 + i * 90
    draw.line([(x, 5), (x, 20 + i * 3)], fill='#e94560', width=2)
for i in range(5):
    x = 50 + i * 90
    draw.line([(x, H - 5), (x, H - 20 - i * 3)], fill='#0ea5e9', width=2)

# --- Download arrow icon (right side) ---
def draw_download_icon(draw, cx, cy, size, color):
    s = size
    bar_w = s * 0.22
    draw.rectangle([cx - bar_w, cy - s*0.5, cx + bar_w, cy + s*0.1], fill=color)
    draw.polygon([
        (cx - s*0.45, cy + s*0.05),
        (cx + s*0.45, cy + s*0.05),
        (cx, cy + s*0.5)
    ], fill=color)
    tray_y = cy + s * 0.55
    draw.rectangle([cx - s*0.55, tray_y, cx + s*0.55, tray_y + s*0.08], fill=color)
    draw.rectangle([cx - s*0.55, tray_y - s*0.2, cx - s*0.55 + s*0.08, tray_y + s*0.08], fill=color)
    draw.rectangle([cx + s*0.55 - s*0.08, tray_y - s*0.2, cx + s*0.55, tray_y + s*0.08], fill=color)

draw_download_icon(draw, 365, 125, 65, '#e94560')

# --- Small file icons ---
def draw_file_icon(draw, x, y, w, h, color, fold_color):
    fold = w * 0.3
    draw.polygon([
        (x, y), (x + w - fold, y), (x + w, y + fold), (x + w, y + h), (x, y + h)
    ], fill=color, outline=fold_color, width=1)
    draw.polygon([
        (x + w - fold, y), (x + w, y + fold), (x + w - fold, y + fold)
    ], fill=fold_color)
    for i in range(2):
        ly = y + h * 0.4 + i * (h * 0.18)
        if ly < y + h - 5:
            draw.line([(x + 5, ly), (x + w - 8, ly)], fill=fold_color, width=1)

offsets = [(0, 0, '#3b82f6', '#1e40af'), (-12, -10, '#22c55e', '#15803d'), (-24, -20, '#f59e0b', '#b45309')]
for dx, dy, c, fc in reversed(offsets):
    draw_file_icon(draw, 330 + dx, 60 + dy, 30, 40, c, fc)

# --- Font helpers ---
def get_font(size):
    for fp in ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"]:
        if os.path.exists(fp):
            try: return ImageFont.truetype(fp, size)
            except: pass
    return ImageFont.load_default()

def get_bold_font(size):
    for fp in ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/calibrib.ttf"]:
        if os.path.exists(fp):
            try: return ImageFont.truetype(fp, size)
            except: pass
    return get_font(size)

# --- Extension icon ---
icon_path = os.path.join(os.path.dirname(__file__), 'Src', 'icons', 'icon128.png')
if os.path.exists(icon_path):
    icon = Image.open(icon_path).convert('RGBA').resize((52, 52), Image.LANCZOS)
    img.paste(icon, (30, 55), icon)
    draw = ImageDraw.Draw(img)
    title_x = 92
else:
    title_x = 30

# --- Title ---
title_font = get_bold_font(36)
draw.text((title_x, 50), "Batch File", fill='#ffffff', font=title_font)
draw.text((title_x, 92), "Downloader", fill='#e94560', font=title_font)

# --- Tagline ---
tag_font = get_font(16)
draw.text((30, 155), "Smart batch download files from any web page", fill='#94a3b8', font=tag_font)
draw.text((30, 176), "with anti-detection & stealth mode", fill='#94a3b8', font=tag_font)

# --- Feature pills ---
pill_font = get_font(12)
pills = ["20+ Sources", "Stealth Mode", "17 Languages"]
pill_colors = ['#e94560', '#f59e0b', '#8b5cf6']
px = 30
py = 215
for text, color in zip(pills, pill_colors):
    bbox = draw.textbbox((0, 0), text, font=pill_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw, ph = tw + 16, th + 10
    r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph//2, fill=(r_c, g_c, b_c))
    draw.text((px + 8, py + 4), text, fill='#ffffff', font=pill_font)
    px += pw + 8

# --- Bottom text ---
badge_font = get_font(11)
draw.text((30, 252), "Chrome Extension  ?  Manifest V3  ?  Free & Open Source", fill='#64748b', font=badge_font)

# --- Save ---
out_path = os.path.join(os.path.dirname(__file__), 'promo_small_440x280.png')
img.convert('RGB').save(out_path, 'PNG')
print(f"Banner saved to: {out_path}")
print(f"Size: {img.convert('RGB').size}")
