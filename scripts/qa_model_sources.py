"""检查可编辑模型的喷口圆度、同轴关系和专用无人机结构。"""
import argparse
import json
from pathlib import Path

import bpy
from mathutils import Vector


def bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    return (low + high) / 2, high - low


def check(source):
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    kind = source.stem
    sockets = [obj for obj in scene.objects if obj.name.startswith('exhaust_')]
    expected = 1 if kind == 'kamikaze' else 4 if kind in ['tempest', 'super'] else 2
    assert len(sockets) == expected, f'{kind} 喷口数量不正确'
    checks = []
    for socket in sockets:
        index = socket.name.removeprefix('exhaust_')
        axis = socket.matrix_world.translation
        shell_center, _ = bounds(scene.objects[f'中空矢量喷口_{index}'])
        assert abs(shell_center.x-axis.x) < .0001 and abs(shell_center.z-axis.z) < .0001
        for prefix in ['喷口支承环', '喷口唇口', '燃烧室热环']:
            center, size = bounds(scene.objects[f'{prefix}_{index}'])
            ratio = size.x / size.z
            error = max(abs(center.x-axis.x), abs(center.z-axis.z))
            # 从世界包围盒判断，避免再次将局部轴变形误判为正确圆环。
            assert abs(ratio-1) < .002, f'{kind}/{prefix}_{index} 圆环被压扁：{ratio}'
            assert error < .0001, f'{kind}/{prefix}_{index} 偏离喷口轴线：{error}'
            checks.append({'part': f'{prefix}_{index}', 'widthHeightRatio': round(ratio, 6), 'axisError': round(error, 6)})
    if kind == 'kamikaze':
        names = [obj.name for obj in scene.objects if not obj.hide_render]
        assert sum(name.startswith('三瓣装甲鳍_') for name in names) == 3
        assert not any(term in name for name in names for term in ['座舱', '外倾垂直尾翼', '整体翼梁', '航炮', '武器承力挂架'])
        assert abs(sockets[0].matrix_world.translation.x) < .0001
    return {'kind': kind, 'sockets': len(sockets), 'rings': checks}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path('assets/model-sources'))
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    results = [check(source) for source in sorted(args.source.glob('*.blend'))]
    assert results, '没有找到模型源文件'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f'通过：{len(results)} 类模型、{sum(len(result["rings"]) for result in results)} 个喷口圆环', flush=True)
