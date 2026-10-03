"""从最终 Blender 源文件生成机库、情报与首页共用的模型预览图。"""

import argparse
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def render(source: Path, output: Path):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
    maximum = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
    center = (minimum + maximum) / 2
    extent = max(maximum.x - minimum.x, maximum.y - minimum.y)
    turn = Matrix.Translation(center) @ Matrix.Rotation(3.141592653589793, 4, "Z") @ Matrix.Translation(-center)
    for mesh in meshes:
        mesh.matrix_world = turn @ mesh.matrix_world

    camera_data = bpy.data.cameras.new("预览正交相机")
    camera = bpy.data.objects.new("预览正交相机", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (center.x + extent * 0.16, center.y - extent * 0.22, maximum.z + extent * 2.3)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = extent * 1.32
    scene.camera = camera

    for name, coords, power, color in [
        ("主光", (-0.8, 0.8, 1.8), 5200, (0.82, 0.92, 1.0)),
        ("轮廓光", (1.0, -0.5, 1.3), 3200, (0.34, 0.65, 1.0)),
        ("暖色补光", (-1.0, -0.9, 0.7), 1800, (1.0, 0.64, 0.39)),
    ]:
        lamp_data = bpy.data.lights.new(name, "AREA")
        lamp_data.energy = power
        lamp_data.color = color
        lamp_data.shape = "DISK"
        lamp_data.size = extent * 1.7
        lamp = bpy.data.objects.new(name, lamp_data)
        scene.collection.objects.link(lamp)
        lamp.location = center + Vector((coords[0] * extent, coords[1] * extent, coords[2] * extent))
        direction = center - lamp.location
        lamp.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    world = bpy.data.worlds.new("预览环境")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.25, 0.34, 0.42, 1)
    background.inputs["Strength"].default_value = 1.6
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(output)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = 0.8
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"预览已生成：{output}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    render(args.source, args.output)


if __name__ == "__main__":
    main()
