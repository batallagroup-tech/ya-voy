import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(filename, bg_color_top, bg_color_bottom, symbol_type):
    width, height = 512, 512
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Edge-to-edge full canvas background gradient
    for y in range(height):
        r = int(bg_color_top[0] + (bg_color_bottom[0] - bg_color_top[0]) * (y / height))
        g = int(bg_color_top[1] + (bg_color_bottom[1] - bg_color_top[1]) * (y / height))
        b = int(bg_color_top[2] + (bg_color_bottom[2] - bg_color_top[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Draw subtle inner gold border ring for premium feel
    draw.rounded_rectangle([16, 16, width - 16, height - 16], radius=40, outline=(255, 179, 0, 80), width=4)

    # 3. Draw Centered Emblem
    cx, cy = 256, 256
    gold_color = (255, 179, 0, 255)
    gold_light = (255, 213, 79, 255)
    white_color = (255, 255, 255, 255)

    if symbol_type == "usuario":
        # Shopping Bag / Food Bag with Location Pin
        # Bag Body
        draw.rounded_rectangle([136, 180, 376, 390], radius=30, fill=gold_color, outline=white_color, width=4)
        # Bag Handles
        draw.arc([196, 110, 316, 210], start=180, end=360, fill=gold_light, width=14)
        # Location / Food Pin in center
        draw.ellipse([226, 230, 286, 290], fill=(156, 13, 56, 255))
        draw.polygon([(228, 275), (284, 275), (256, 335)], fill=(156, 13, 56, 255))
        draw.ellipse([244, 248, 268, 272], fill=gold_light)

    elif symbol_type == "repartidor":
        # Delivery Scooter / Helmet Badge
        # Outer Gold Circle Badge
        draw.ellipse([106, 106, 406, 406], fill=gold_color, outline=white_color, width=6)
        # Inner Carmine Circle
        draw.ellipse([126, 126, 386, 386], fill=(156, 13, 56, 255))
        # Scooter Body & Wheels
        # Back wheel
        draw.ellipse([160, 310, 220, 370], fill=gold_light, outline=white_color, width=4)
        draw.ellipse([180, 330, 200, 350], fill=(156, 13, 56, 255))
        # Front wheel
        draw.ellipse([292, 310, 352, 370], fill=gold_light, outline=white_color, width=4)
        draw.ellipse([312, 330, 332, 350], fill=(156, 13, 56, 255))
        # Body frame
        draw.line([(190, 340), (270, 340), (310, 240)], fill=gold_color, width=12)
        # Delivery Box on back
        draw.rounded_rectangle([150, 200, 230, 290], radius=12, fill=gold_light, outline=white_color, width=3)
        # Windshield / Handlebar
        draw.line([(310, 240), (300, 190)], fill=white_color, width=8)

    elif symbol_type == "restaurante":
        # Chef Cloche / Fork & Spoon Badge
        # Outer Gold Circle
        draw.ellipse([106, 106, 406, 406], fill=gold_color, outline=white_color, width=6)
        # Inner Carmine Dome
        draw.ellipse([136, 136, 376, 376], fill=(127, 13, 43, 255))
        # Cloche Dome
        draw.arc([166, 170, 346, 350], start=180, end=360, fill=gold_light, width=16)
        # Cloche Base Tray
        draw.rounded_rectangle([156, 310, 356, 330], radius=8, fill=gold_color, outline=white_color, width=3)
        # Handle knob
        draw.ellipse([241, 150, 271, 180], fill=gold_light)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename, "PNG")
    print(f"Generated clean 512x512 icon: {filename}")

# Generate for Usuario
create_icon(
    r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\playstore_icon_512.png",
    (127, 13, 43), (156, 13, 56), "usuario"
)

# Generate for Repartidor
create_icon(
    r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor\playstore_icon_512.png",
    (106, 11, 36), (156, 13, 56), "repartidor"
)

# Generate for Restaurante
create_icon(
    r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante\playstore_icon_512.png",
    (24, 8, 18), (127, 13, 43), "restaurante"
)
