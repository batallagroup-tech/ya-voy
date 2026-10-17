import os
from PIL import Image

logo_path = r"C:\Users\Ramses Batalla\.gemini\antigravity\brain\959a8444-2f1e-4d4d-8f17-b25a214949c7\.user_uploaded\media_1791583881919_b2cb4987.jpg"

if not os.path.exists(logo_path):
    print("Error: Logo source not found!")
    exit(1)

base_img = Image.open(logo_path).convert("RGBA")

# Mipmap dimensions
sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

app_res = r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\android\app\src\main\res"

for folder, sz in sizes.items():
    folder_path = os.path.join(app_res, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # 1. Launcher square icon
    resized = base_img.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
    resized.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    resized.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

    # Solid Carmín Rubí background #73112A (RGB: 115, 17, 42)
    bg_img = Image.new("RGBA", (sz, sz), (115, 17, 42, 255))
    bg_img.save(os.path.join(folder_path, "ic_launcher_background.png"), "PNG")

print("Successfully updated all Android launcher mipmap icons for ya-voy-usuario!")
