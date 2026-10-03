"""将 Quaternius CC0 飞船源文件改造为本项目的可编辑 Blender 与 GLB 资产。"""

import argparse
from io import BytesIO
from pathlib import Path

import bpy
import numpy as np
from PIL import Image
from mathutils import Vector
from mathutils.bvhtree import BVHTree


MODELS = {
    "vanguard": ("Challenger", "Blue", "player", 1.0),
    "strider": ("Spitfire", "Blue", "player", 0.88),
    "tempest": ("Striker", "Blue", "player", 1.0),
    "aegis": ("Imperial", "Blue", "player", 1.12),
    "nova": ("Zenith", "Orange", "player", 1.08),
    "specter": ("Omen", "Purple", "player", 0.82),
    "grunt": ("Bob", "Green", "enemy", 1.0),
    "kamikaze": ("Insurgent", "Orange", "enemy", 0.9),
    "elite": ("Dispatcher", "Purple", "enemy", 1.12),
    "super": ("Executioner", "Red", "enemy", 1.22),
}


def make_material(name: str, color: tuple[float, float, float], metallic=0.65, roughness=0.38, glow=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if glow:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = glow
    return material


def box(name, location, dimensions, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("倒角", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normal = obj.modifiers.new("加权法线", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return obj


def source_path(root: Path, name: str) -> Path:
    candidates = [root / name / "Blend" / f"{name}.blend", root / f"{name}.blend"]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"找不到 {name} 的 Blender 源文件：{candidates}")


def recolor_packed_image(image, color: str, output: Path) -> Path:
    if not image or not image.packed_file:
        raise RuntimeError(f"原始贴图未打包：{image.name if image else '缺失'}")
    source = Image.open(BytesIO(bytes(image.packed_file.data))).convert("RGBA")
    rgba = np.array(source)
    hsv = np.array(source.convert("HSV"))
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    warm = ((hue < 52) | (hue > 242)) & (saturation > 48) & (value > 35)
    target = {"Blue": 145, "Purple": 190, "Green": 88, "Orange": 20, "Red": 3}[color]
    hue[warm] = target
    result = Image.fromarray(hsv, "HSV").convert("RGBA")
    result.putalpha(Image.fromarray(rgba[:, :, 3]))
    output.parent.mkdir(parents=True, exist_ok=True)
    result.save(output, optimize=True)
    return output


def build(kind: str, source_root: Path, destination: Path):
    name, color, faction, width_factor = MODELS[kind]
    bpy.ops.wm.open_mainfile(filepath=str(source_path(source_root, name)))
    original = next(obj for obj in bpy.data.objects if obj.type == "MESH")
    original.name = f"{kind}_base_hull"
    original.scale.x *= width_factor
    bpy.context.view_layer.objects.active = original
    original.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    original.select_set(False)

    texture_file = source_root / name / "Textures" / f"{name}_{color}.png"
    source_image = next((node.image for material in original.data.materials for node in material.node_tree.nodes if node.type == "TEX_IMAGE"), None)
    if not texture_file.is_file() and color != "Orange":
        texture_file = recolor_packed_image(source_image, color, destination / "texture-work" / f"{kind}.png")
    for material in original.data.materials:
        material.use_nodes = True
        shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        shader.inputs["Metallic"].default_value = 0.58
        shader.inputs["Roughness"].default_value = 0.42
        if texture_file.is_file():
            image = bpy.data.images.load(str(texture_file), check_existing=True)
            image.pack()
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE":
                    node.image = image

    # 原模型俯视机首沿 -Y；以下结构都按包围盒比例添加，方便不同机型共用加工工序。
    corners = [original.matrix_world @ Vector(corner) for corner in original.bound_box]
    xmin, xmax = min(v.x for v in corners), max(v.x for v in corners)
    ymin, ymax = min(v.y for v in corners), max(v.y for v in corners)
    zmin, zmax = min(v.z for v in corners), max(v.z for v in corners)
    width, length, height = xmax - xmin, ymax - ymin, zmax - zmin
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    unit = max(width, length)
    metal = make_material(f"{kind}_titanium", (0.31, 0.39, 0.45) if faction == "player" else (0.37, 0.32, 0.31))
    dark = make_material(f"{kind}_carbon", (0.035, 0.065, 0.085), roughness=0.5)
    accent_color = (0.13, 0.59, 0.88) if faction == "player" else (0.95, 0.22, 0.08)
    accent = make_material(f"{kind}_navigation", accent_color, metallic=0.25, roughness=0.23, glow=1.7)
    hull_surface = BVHTree.FromObject(original, bpy.context.evaluated_depsgraph_get())
    world_to_hull = original.matrix_world.inverted()

    def surface_height(x: float, y: float):
        start = world_to_hull @ Vector((x, y, zmax + unit))
        direction = (world_to_hull.to_3x3() @ Vector((0, 0, -1))).normalized()
        hit, _, _, _ = hull_surface.ray_cast(start, direction)
        return (original.matrix_world @ hit).z if hit else None

    def surface_panel(name: str, x: float, y: float, dimensions, material):
        z = surface_height(x, y)
        if z is None:
            return
        box(name, (x, y, z + dimensions[2] * 0.32), dimensions, material, dimensions[2] * 0.22)

    for side in (-1, 1):
        # 在原始表面投射定位，避免不同机型的空心翼、缺口与斜面产生悬空零件。
        surface_panel(f"{kind}_wing_light_{side}", cx + side * width * 0.21, cy - length * 0.03,
                      (unit * 0.012, length * 0.12, unit * 0.009), accent)
        for index in range(3):
            surface_panel(f"{kind}_service_panel_{side}_{index}", cx + side * width * 0.14,
                          cy + length * (index - 1) * 0.12,
                          (width * 0.045, length * 0.035, unit * 0.008), metal)

    if kind in {"aegis", "super"}:
        for side in (-1, 1):
            surface_panel(f"{kind}_heavy_shield_{side}", cx + side * width * 0.26, cy,
                          (width * 0.075, length * 0.22, unit * 0.012), dark)
    if kind in {"nova", "tempest", "elite"}:
        for side in (-1, 1):
            surface_panel(f"{kind}_auxiliary_rail_{side}", cx + side * width * 0.19, cy - length * 0.18,
                          (unit * 0.018, length * 0.14, unit * 0.012), dark)

    destination.mkdir(parents=True, exist_ok=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(destination / "sources" / f"{kind}.blend"))
    bpy.ops.export_scene.gltf(filepath=str(destination / "raw" / f"{kind}.glb"), export_format="GLB", export_apply=True)
    print(f"完成 {kind}: {name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--only", choices=MODELS)
    arguments = parser.parse_args()
    (arguments.destination / "sources").mkdir(parents=True, exist_ok=True)
    (arguments.destination / "raw").mkdir(parents=True, exist_ok=True)
    for kind in [arguments.only] if arguments.only else MODELS:
        build(kind, arguments.source_root, arguments.destination)


if __name__ == "__main__":
    main()
