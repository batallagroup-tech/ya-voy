import os
from PIL import Image

def update_mipmaps(project_dir, icon_src):
    res_dir = os.path.join(project_dir, "android", "app", "src", "main", "res")
    if not os.path.exists(res_dir):
        print(f"Skipping (res directory not found): {res_dir}")
        return

    densities = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192)
    }

    base_img = Image.open(icon_src).convert("RGBA")

    for folder, size in densities.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        resized = base_img.resize(size, Image.Resampling.LANCZOS)
        
        # Save standard ic_launcher and ic_launcher_round
        resized.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        resized.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        resized.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

    print(f"Successfully updated Android mipmap launcher icons for: {project_dir}")

# Update for Usuario
update_mipmaps(
    r"C:\Proyectos\personal\ya-voy\ya-voy-usuario",
    r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\playstore_icon_512.png"
)

# Update for Repartidor
update_mipmaps(
    r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor",
    r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor\playstore_icon_512.png"
)

# Update for Restaurante
update_mipmaps(
    r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante",
    r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante\playstore_icon_512.png"
)
