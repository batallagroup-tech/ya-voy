import os
import glob

def replace_in_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Replace old primary brand hex codes with official Carmín Rubí (#9C0D38) and dark carmine (#7A0A2C)
    content = content.replace("#F107A3", "#9C0D38")
    content = content.replace("#7B2FF7", "#9C0D38")
    content = content.replace("#6C3CE1", "#9C0D38")
    content = content.replace("#9B59B6", "#7A0A2C")
    content = content.replace("#E91E8C", "#9C0D38")
    content = content.replace("#FF6B00", "#9C0D38")
    content = content.replace("#E65F00", "#7A0A2C")

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated colors in: {filepath}")

for root_dir in [
    r"C:\Proyectos\personal\ya-voy\ya-voy-usuario\src",
    r"C:\Proyectos\personal\ya-voy\ya-voy-repartidor\src",
    r"C:\Proyectos\personal\ya-voy\ya-voy-restaurante\src"
]:
    for ext in ["*.ts", "*.tsx", "*.css"]:
        for filepath in glob.glob(os.path.join(root_dir, "**", ext), recursive=True):
            replace_in_file(filepath)

print("Color unification completed!")
