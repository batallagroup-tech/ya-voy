import os
from PIL import Image, ImageDraw

def center_logo_on_new_bg(icon_path, bg_color_top, bg_color_bottom):
    if not os.path.exists(icon_path):
        print(f"File not found: {icon_path}")
        return

    # Load original image
    orig_img = Image.open(icon_path).convert("RGBA")
    w, h = 512, 512

    # 1. Create new 512x512 canvas with Carmín Rubí gradient
    new_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(new_img)

    for y in range(h):
        r = int(bg_color_top[0] + (bg_color_bottom[0] - bg_color_top[0]) * (y / h))
        g = int(bg_color_top[1] + (bg_color_bottom[1] - bg_color_top[1]) * (y / h))
        b = int(bg_color_top[2] + (bg_color_bottom[2] - bg_color_top[2]) * (y / h))
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # 2. Draw subtle inner gold border ring for premium feel
    draw.rounded_rectangle([16, 16, w - 16, h - 16], radius=40, outline=(255, 179, 0, 90), width=4)

    # 3. Scale & Center the original logo onto the canvas
    # Get bounding box of visible graphic if transparent, or scale to fit nicely centered
    bbox = orig_img.getbbox()
    if bbox:
        cropped = orig_img.crop(bbox)
    else:
        cropped = orig_img

    # Target max size: 360x360 centered
    target_size = 360
    cw, ch = cropped.size
    ratio = min(target_size / cw, target_size / ch)
    nw, nh = int(cw * ratio), int(ch * ratio)
    resized_emblem = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    # Calculate center position
    offset_x = (w - nw) // 2
    offset_y = (h - nh) // 2

    # Paste centered onto the new gradient background
    new_img.paste(resized_emblem, (offset_x, offset_y), resized_emblem)

    # Save output
    new_img.save(icon_path, "PNG")
    print(f"Successfully centered original logo on new background: {icon_path}")

# Usuario
center_logo_on_new_bg(
    r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\playstore_icon_512.png",
    (127, 13, 43), (156, 13, 56)
)

# Repartidor
center_logo_on_new_bg(
    r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor\playstore_icon_512.png",
    (106, 11, 36), (156, 13, 56)
)

# Restaurante
center_logo_on_new_bg(
    r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante\playstore_icon_512.png",
    (127, 13, 43), (74, 5, 26)
)
