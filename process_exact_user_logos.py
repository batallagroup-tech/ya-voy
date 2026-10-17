import os
from PIL import Image

USER_IMG_PATH = r"C:\Users\Ramses Batalla\.gemini\antigravity\brain\959a8444-2f1e-4d4d-8f17-b25a214949c7\.user_uploaded\media_1791583881919_b2cb4987.jpg"

def process_logos():
    if not os.path.exists(USER_IMG_PATH):
        print("User image not found!")
        return

    user_img = Image.open(USER_IMG_PATH).convert("RGBA")
    
    # Extract exact background color from top-left corner
    bg_color = user_img.getpixel((10, 10)) # (r, g, b, a)
    print(f"Extracted exact Carmín Rubí background color: {bg_color[:3]}")

    # 1. USUARIO: High quality 512x512 from exact user image
    usuario_512 = user_img.resize((512, 512), Image.Resampling.LANCZOS)
    usuario_out = r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\playstore_icon_512.png"
    usuario_512.save(usuario_out, "PNG", quality=100)
    print(f"Saved Usuario icon: {usuario_out}")

    # Helper function for Repartidor and Restaurante: extract white emblem, place on solid bg
    def create_clean_logo_from_original(orig_path, out_path):
        if not os.path.exists(orig_path):
            print(f"Original file missing: {orig_path}")
            return
        
        orig = Image.open(orig_path).convert("RGBA")
        w, h = 512, 512

        # Create solid canvas with exact background color
        canvas = Image.new("RGBA", (w, h), bg_color)

        # Isolate white elements from original emblem
        # Convert to grayscale and threshold white pixels
        gray = orig.convert("L")
        # Mask white pixels (value > 200)
        white_mask = gray.point(lambda p: 255 if p > 180 else 0)

        # Create pure white emblem image
        white_emblem = Image.new("RGBA", orig.size, (255, 255, 255, 255))
        
        # Bounding box of white emblem
        bbox = white_mask.getbbox()
        if bbox:
            cropped_emblem = white_emblem.crop(bbox)
            cropped_mask = white_mask.crop(bbox)

            # Target size: max 280x280 centered
            target_size = 280
            cw, ch = cropped_emblem.size
            ratio = min(target_size / cw, target_size / ch)
            nw, nh = int(cw * ratio), int(ch * ratio)

            resized_emblem = cropped_emblem.resize((nw, nh), Image.Resampling.LANCZOS)
            resized_mask = cropped_mask.resize((nw, nh), Image.Resampling.LANCZOS)

            offset_x = (w - nw) // 2
            offset_y = (h - nh) // 2

            canvas.paste(resized_emblem, (offset_x, offset_y), resized_mask)
        
        canvas.save(out_path, "PNG", quality=100)
        print(f"Saved logo: {out_path}")

    # 2. REPARTIDOR
    create_clean_logo_from_original(
        r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor-v2\playstore_icon_512.png",
        r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor\playstore_icon_512.png"
    )

    # 3. RESTAURANTE
    create_clean_logo_from_original(
        r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante-v2\playstore_icon_512.png",
        r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante\playstore_icon_512.png"
    )

if __name__ == "__main__":
    process_logos()
