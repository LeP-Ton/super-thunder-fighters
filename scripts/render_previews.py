"""从同一份 Blender 模型生成斜视展示和正俯视降级素材。"""
import argparse
from pathlib import Path
import bpy
from mathutils import Vector

def render(source,output,top=False,hero=False,rear=False):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    meshes=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
    corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    low=Vector([min(v[i] for v in corners) for i in range(3)]); high=Vector([max(v[i] for v in corners) for i in range(3)])
    center=(low+high)/2; extent=max(high.x-low.x,high.y-low.y)
    data=bpy.data.cameras.new('展示相机'); camera=bpy.data.objects.new('展示相机',data); scene.collection.objects.link(camera)
    offset=Vector((0,0,2.5)) if top else Vector((1.05,-1.35 if rear else 1.35,1.1))
    camera.location=center+offset*extent; camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO'; scene.camera=camera
    # 以相机投影后的真实包围盒取景；不同翼型在斜视下的宽度不能由机身长度猜测。
    bpy.context.view_layer.update()
    inverse=camera.matrix_world.inverted(); projected=[inverse@v for v in corners]
    left,right=min(v.x for v in projected),max(v.x for v in projected)
    bottom,upper=min(v.y for v in projected),max(v.y for v in projected)
    camera.location+=camera.matrix_world.to_quaternion()@Vector(((left+right)/2,(bottom+upper)/2,0))
    aspect=1400/900 if hero else 1
    data.ortho_scale=max(right-left,(upper-bottom)*aspect)*1.13
    for name,coord,power,color,size in [('主灯',(-.6,1.0,1.5),1800,(.81,.90,1),1.1),('边缘灯',(-1,-1,.8),1600,(1,.65,.38),1.1),('补灯',(1,.5,.7),900,(.82,.89,1),1.4)]:
        light=bpy.data.lights.new(name,'AREA'); light.energy=power*(extent/10)**2; light.color=color; light.shape='DISK'; light.size=extent*size
        obj=bpy.data.objects.new(name,light); scene.collection.objects.link(obj); obj.location=center+Vector(coord)*extent; obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
    world=bpy.data.worlds.new('中性环境'); world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.28,.32,.38,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65; scene.world=world
    scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
    scene.render.resolution_x=1400 if hero else 640; scene.render.resolution_y=900 if hero else 640
    scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.filepath=str(output)
    scene.view_settings.view_transform='AgX'; scene.view_settings.exposure=.65
    output.parent.mkdir(exist_ok=True,parents=True); bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--source',type=Path,required=True); p.add_argument('--output',type=Path,required=True); p.add_argument('--top',action='store_true'); p.add_argument('--hero',action='store_true'); p.add_argument('--rear',action='store_true'); a=p.parse_args(); render(a.source,a.output,a.top,a.hero,a.rear)
