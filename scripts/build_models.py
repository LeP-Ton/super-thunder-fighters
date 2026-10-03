"""以 Greyoxide Shipyard 的 CC0 发动机、武器组件为基础，制作军工战机。

源文件保留独立装甲、座舱、机翼与机械件；导出时按材质合并，降低运行时绘制次数。
Blender Z 轴向上、机首朝 +Y；glTF 转换后 Y 轴向上、机首朝 -Z。
"""
import argparse
import math
import tempfile
from pathlib import Path
import bpy
import numpy as np
from PIL import Image
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

FLEET = {
    'vanguard': dict(code='01', wing=4.5, length=1, body=1, sweep=0, paint=(.34,.40,.43), accent=(.85,.21,.035)),
    'strider': dict(code='02', wing=3.8, length=1.12, body=.76, sweep=2.5, paint=(.43,.48,.47), accent=(.64,.68,.65)),
    'tempest': dict(code='03', wing=4.15, length=.92, body=1.05, sweep=.8, paint=(.22,.29,.27), accent=(.80,.51,.12), quad=True),
    'aegis': dict(code='04', wing=4.8, length=.94, body=1.36, sweep=-.1, paint=(.45,.40,.29), accent=(.76,.21,.07), heavy=True),
    'nova': dict(code='05', wing=4.15, length=1.08, body=1.08, sweep=.2, paint=(.39,.40,.38), accent=(.68,.19,.08), cannon=True),
    'specter': dict(code='06', wing=5.2, length=.78, body=.85, sweep=-.8, paint=(.13,.17,.20), accent=(.34,.41,.44), stealth=True),
    'grunt': dict(code='71', wing=3.55, length=.76, body=.76, sweep=.4, paint=(.070,.083,.105), accent=(.46,.016,.026), drone=True),
    'kamikaze': dict(code='72', length=1, body=1, paint=(.055,.066,.082), accent=(.52,.019,.032), drone=True),
    'elite': dict(code='81', wing=4.3, length=1.04, body=1.12, sweep=1.6, paint=(.060,.073,.090), accent=(.37,.012,.025), cannon=True, drone=True),
    'super': dict(code='91', wing=5.15, length=1.16, body=1.48, sweep=-.6, paint=(.084,.092,.110), accent=(.42,.014,.024), heavy=True, quad=True, drone=True),
}
M = {}
SOURCE = {}
TEXTURE_DIR = Path(tempfile.gettempdir()) / 'super-thunder-materials'

def material(name, color, metal=.6, rough=.36, glow=0):
    mat=bpy.data.materials.new(name); mat.diffuse_color=(*color,1); mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    if glow:
        bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=glow
    return mat

def surface_finish(mat, color, kind, roughness=.32):
    # 通过可打包的 PBR 数据贴图保留微小漆面变化，Blender 与 WebGL 读取同一结果。
    TEXTURE_DIR.mkdir(exist_ok=True)
    rng=np.random.default_rng(42); n=512
    coarse=np.array(Image.fromarray((rng.random((128,128))*255).astype(np.uint8)).resize((n,n),Image.Resampling.BICUBIC))/255
    noise=rng.random((n,n)); scratches=np.zeros((n,n))
    for _ in range(1100):
        x,y=rng.integers(0,n,2); length=int(rng.integers(1,9)); scratches[y,(x+np.arange(length))%n]=rng.uniform(.12,.65)
    modulation=.94+coarse*.045+noise*.015
    base=np.array(color)**(1/2.2)
    rgb=np.clip((base[None,None,:]*modulation[:,:,None]+scratches[:,:,None]*.045)*255,0,255).astype(np.uint8)
    rough=np.clip(roughness+coarse*.04+noise*.015+scratches*.08,0,1)
    height=noise*.001+coarse*.006+scratches*.01
    dx=np.roll(height,1,1)-np.roll(height,-1,1); dy=np.roll(height,1,0)-np.roll(height,-1,0)
    normal=np.dstack((.5+dx,.5+dy,np.ones_like(dx)))
    paths=[]
    for name,data in [('paint',rgb),('roughness',(rough*255).astype(np.uint8)),('normal',(normal*255).astype(np.uint8))]:
        path=TEXTURE_DIR/f'{kind}-{name}.png'; Image.fromarray(data).save(path); paths.append(path)
    nodes=mat.node_tree.nodes; links=mat.node_tree.links; shader=nodes.get('Principled BSDF')
    for path,input_name in zip(paths,['Base Color','Roughness','Normal']):
        image=bpy.data.images.load(str(path)); image.pack(); tex=nodes.new('ShaderNodeTexImage'); tex.image=image
        if input_name!='Base Color': image.colorspace_settings.name='Non-Color'
        if input_name=='Normal':
            normal_node=nodes.new('ShaderNodeNormalMap'); normal_node.inputs['Strength'].default_value=.35
            links.new(tex.outputs['Color'],normal_node.inputs['Color']); links.new(normal_node.outputs['Normal'],shader.inputs['Normal'])
        else: links.new(tex.outputs['Color'],shader.inputs[input_name])

def finish(obj, mat, bevel=.025, smooth=False):
    obj.data.materials.clear(); obj.data.materials.append(mat)
    if bevel:
        b=obj.modifiers.new('精密装甲倒角','BEVEL'); b.width=bevel; b.segments=3
        b.limit_method='ANGLE'
        n=obj.modifiers.new('硬表面加权法线','WEIGHTED_NORMAL'); n.keep_sharp=True; n.weight=40
    for p in obj.data.polygons: p.use_smooth=smooth
    return obj

def mesh(name, verts, faces, mat, bevel=.025):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); obj.select_set(False)
    return finish(obj,mat,bevel)

def plate(name, polygon, z, thickness, mat, bevel=.025):
    n=len(polygon); verts=[(x,y,z+dz) for dz in (-thickness/2,thickness/2) for x,y in polygon]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,bevel)

def loft(name, stations, mat, bevel=.035):
    # 八边截面留下连续的肩部折面，避免机身看起来像椭圆玩具。
    profile=[(-.68,1),(.68,1),(1,.42),(1,-.35),(.65,-1),(-.65,-1),(-1,-.35),(-1,.42)]
    verts=[(u*w,y,z+v*h) for y,w,h,z in stations for u,v in profile]
    n=len(profile); faces=[tuple(reversed(range(n))),tuple(range(len(verts)-n,len(verts)))]
    for j in range(len(stations)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    return mesh(name,verts,faces,mat,bevel)

def box(name, pos, dim, mat, bevel=.02, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); obj=bpy.context.object; obj.name=name; obj.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rot: obj.rotation_euler=rot
    obj.select_set(False); return finish(obj,mat,bevel)

def cylinder(name,pos,radius,depth,mat,axis='Y',vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=pos)
    obj=bpy.context.object; obj.name=name
    if axis=='Y': obj.rotation_euler.x=math.pi/2
    obj.select_set(False); return finish(obj,mat,.015,True)

def ring(name, pos, radius, minor, mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,major_radius=radius,minor_radius=minor,location=pos,rotation=(math.pi/2,0,0))
    obj=bpy.context.object; obj.name=name; obj.select_set(False); return finish(obj,mat,0,True)

def source_part(source_name,name,center,dim,mat):
    original=SOURCE[source_name]
    # 先计算原文件的变换与修改器，再将组件归一化为舰体上的真实安装尺寸。
    deps=bpy.context.evaluated_depsgraph_get(); data=bpy.data.meshes.new_from_object(original.evaluated_get(deps))
    coords=[v.co.copy() for v in data.vertices]
    lo=Vector([min(v[i] for v in coords) for i in range(3)]); hi=Vector([max(v[i] for v in coords) for i in range(3)])
    for v in data.vertices:
        v.co=Vector([(v.co[i]-(lo[i]+hi[i])/2)/max(.001,hi[i]-lo[i])*dim[i] for i in range(3)])
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=center
    return finish(obj,mat,.008)

def stencil(text, pos, size, mat, name='机翼编号'):
    data=bpy.data.curves.new(name,'FONT'); data.body=text; data.size=size; data.extrude=.0005; data.align_x='CENTER'
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=pos
    obj.data.materials.append(mat); bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.convert(target='MESH'); obj.select_set(False)

def seam(name, points, mat, radius=.008):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.bevel_depth=radius; data.bevel_resolution=1
    line=data.splines.new('POLY'); line.points.add(len(points)-1)
    for p,co in zip(line.points,points): p.co=(*co,1)
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active=obj; obj.select_set(True); bpy.ops.object.convert(target='MESH'); obj.select_set(False)

def canopy():
    controls=[(2.83,.05,.015,.55),(2.50,.23,.18,.62),(2.05,.35,.35,.65),(1.40,.365,.44,.65),(.80,.33,.36,.65),(.30,.23,.15,.65)]
    # 插值增加的是曲面连续性；压框与密封边另外建模，避免玻璃仅靠法线伪装曲率。
    rings=[]
    for j in range(len(controls)-1):
        p0,p1,p2,p3=[Vector(controls[max(0,min(len(controls)-1,k))]) for k in [j-1,j,j+1,j+2]]
        for k in range(5):
            t=k/5
            rings.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
    rings.append(controls[-1])
    verts=[]; segments=32
    for y,w,h,z in rings:
        for i in range(segments+1):
            a=i*math.pi/segments; verts.append((math.cos(a)*w,y,z+math.sin(a)*h))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(segments):
            a=j*(segments+1)+i; faces.append((a,a+1,a+segments+2,a+segments+1))
    obj=mesh('连续曲面镀膜风挡',verts,faces,M['glass'],0)
    for f in obj.data.polygons: f.use_smooth=True
    rear=[(0,.30,.65)]+[(math.cos(i*math.pi/32)*.23,.30,.65+math.sin(i*math.pi/32)*.15) for i in range(33)]
    mesh('后舱密闭风挡',rear,[(0,i+1,i+2) for i in range(32)],M['glass'],0)
    for side in (-1,1): seam('座舱钛合金压框',[(side*w,y,z) for y,w,h,z in rings],M['metal'],.028)
    seam('后舱盖框',[(math.cos(i*math.pi/16)*.24,.31,.65+math.sin(i*math.pi/16)*.155) for i in range(17)],M['metal'],.023)
    for y,w,h,z in [controls[1],controls[4]]:
        seam('风挡分段压框',[(math.cos(i*math.pi/32)*(w+.008),y,z+math.sin(i*math.pi/32)*(h+.008)) for i in range(33)],M['secondary'],.012)
    for side in (-1,1):
        for y in [.50,.78]: box('舱盖锁扣',(side*.355,y,.68),(.07,.12,.055),M['metal'],.015)

def wing(side,cfg):
    w=cfg['wing']; sweep=cfg['sweep']; s=side
    outline=[(.62,1.15),(1.6,.25),(w,-2.0+sweep),(w-.15,-2.85+sweep*.65),(2.1,-2.72),(.68,-2.9)]
    if cfg.get('stealth'): outline=[(.5,2.4),(1.2,1.65),(w,-2.9),(w-.65,-3.25),(2.1,-2.6),(.65,-3.1)]
    poly=[(s*x,y) for x,y in outline]
    plate(f'整体翼梁_{s}',poly,.01,.24,M['dark'],.05)
    cx=sum(x for x,y in poly)/len(poly); cy=sum(y for x,y in poly)/len(poly)
    inset=[(cx+(x-cx)*.96,cy+(y-cy)*.96) for x,y in poly]
    plate(f'机翼外装甲_{s}',inset,.155,.09,M['paint'],.025)
    # 以原翼面轮廓切分嵌板，使前掠翼、飞翼和重型翼的细节都留在实体翼梁之内。
    triangles=tessellate_polygon([[Vector((x,y,0)) for x,y in inset]])
    for i,indices in enumerate(triangles):
        # 前掠翼有凹角，不能使用三角扇，否则嵌板会跨过缺口形成悬空三角片。
        triangle=[inset[index] for index in indices]
        tx=sum(x for x,y in triangle)/3; ty=sum(y for x,y in triangle)/3
        panel=[(tx+(x-tx)*.92,ty+(y-ty)*.92) for x,y in triangle]
        surface=M['accent'] if cfg.get('drone') and i%2==0 else M['secondary'] if i==3 else M['paint']
        plate(f'分区蒙皮_{s}_{i}',panel,.202,.018,surface,.009)
    # 前缘钛合金条与后缘襟翼以真实接缝分离。
    a,b=poly[1],poly[2]
    edge=[a,b,(b[0]-s*.05,b[1]-.09),(a[0]-s*.04,a[1]-.11)]
    plate(f'钛合金前缘_{s}',edge,.22,.02,M['metal'],.008)
    flap=[(s*1.8,-2.2),(s*(w-.6),-2.38+sweep*.62),(s*(w-.62),-2.69+sweep*.62),(s*1.8,-2.52)]
    plate(f'独立襟翼_{s}',flap,.224,.024,M['secondary'],.009)
    stripe=[(s*(w-.78),-1.99+sweep*.81),(s*(w-.49),-2.05+sweep*.90),(s*(w-.50),-2.47+sweep*.69),(s*(w-.78),-2.48+sweep*.66)]
    plate(f'识别涂装_{s}',stripe,.224,.008,M['accent'],.003)
    stencil(cfg['code'],(s*2.45,-1.60+sweep*.34,.218),.38,M['mark'])
    # 凹槽、检修盖与导流板建立不同层级的可制造表面。
    seam('翼面纵向接缝',[(s*1.40,-.04,.208),(s*1.92,-.80,.208),(s*2.50,-2.35+sweep*.22,.208)],M['dark'],.009)
    seam('翼面横向接缝',[(s*1.76,-1.74,.208),(s*2.9,-1.88+sweep*.45,.208),(s*(w-.47),-2.27+sweep*.73,.208)],M['dark'],.008)
    hatch=[(s*1.61,-.91,.216),(s*1.92,-1.05,.216),(s*2.09,-1.47,.216),(s*1.75,-1.40,.216),(s*1.61,-.91,.216)]
    seam('机翼液压检修盖',hatch,M['dark'],.012)
    for j in range(4): box('翼面散热槽',(s*2.15,-1.77-j*.07,.212),(.24,.016,.009),M['dark'],.002)
    stencil('AUTONOMOUS' if cfg.get('drone') else 'NO STEP',(s*2.76,-2.02+sweep*.30,.218),.075,M['mark'],'机翼维护标记')
    for x,y in [(1.75,-1.7),(2.05,-2.15),(1.25,.18),(w-.23,-2.18+sweep*.81)]:
        cylinder(f'翼板固定螺栓_{s}',(s*x,y,.226),.021,.01,M['metal'],axis='Z',vertices=8)
    # 航行灯嵌于翼尖，亮区保持很小。
    box(f'翼尖航行灯_{s}',(s*(w-.14),-2.34+sweep*.77,.18),(.055,.17,.07),M['nav'],.012)

def exhaust_nozzle(x,w,index):
    # 中空喷口的深度、收敛段、内衬、涡轮与外部可动瓣片共同形成真实机械层次。
    profile=[(-2.93,.64),(-3.14,.75),(-3.42,.81),(-3.67,.76),(-3.67,.66),(-3.39,.65),(-3.12,.47)]
    verts=[(x+math.cos(a*math.tau/64)*w*r,y,math.sin(a*math.tau/64)*w*r) for y,r in profile for a in range(64)]
    faces=[(j*64+i,j*64+(i+1)%64,(j+1)*64+(i+1)%64,(j+1)*64+i) for j in range(len(profile)-1) for i in range(64)]
    shell=mesh(f'中空矢量喷口_{index}',verts,faces,M['secondary'],0)
    for p in shell.data.polygons: p.use_smooth=True
    ring(f'喷口支承环_{index}',(x,-3.12,0),w*.77,.04,M['metal'])
    ring(f'喷口唇口_{index}',(x,-3.67,0),w*.72,.025,M['metal'])
    ring(f'燃烧室热环_{index}',(x,-3.16,0),w*.42,.019,M['engine'])
    cylinder(f'燃烧室背板_{index}',(x,-3.06,0),w*.45,.035,M['dark'])
    cylinder(f'涡轮轴芯_{index}',(x,-3.12,0),w*.15,.12,M['metal'])
    for j in range(18):
        a=j*math.tau/18
        # 喷口外瓣片使用径向截面，片间留缝；内部叶片后退到热环内侧。
        angles=[a-.12,a+.12]
        petal=[(x+math.cos(t)*w*r,y,math.sin(t)*w*r) for y,r in [(-3.17,.80),(-3.59,.79),(-3.64,.73),(-3.21,.75)] for t in angles]
        mesh(f'喷口矢量瓣片_{index}_{j}',petal,[(0,1,3,2),(4,6,7,5),(0,2,4,6),(1,7,5,3),(2,3,5,4),(0,6,7,1)],M['metal'],.006)
        blade=box(f'内部涡轮叶片_{index}_{j}',(x+math.cos(a)*w*.29,-3.115,math.sin(a)*w*.29),(.15,.028,.043),M['metal'],.007)
        blade.rotation_euler.y=-a+.35
        if j%3==0:
            seam(f'喷口液压连杆_{index}_{j}',[(x+math.cos(a)*w*.83,-2.91,math.sin(a)*w*.83),(x+math.cos(a)*w*.86,-3.32,math.sin(a)*w*.86)],M['metal'],.018)
    empty=bpy.data.objects.new(f'exhaust_{index}',None); bpy.context.collection.objects.link(empty); empty.location=(x,-3.68,0); empty['radius']=w*.5

def engine(x,cfg,index):
    w=.53*(1.12 if cfg.get('heavy') else 1)
    loft(f'发动机短舱_{index}',[(1.3,w*.55,.32,0),(.65,w,.43,0),(-1.9,w,.44,0),(-3.0,w*.87,.36,0)],M['paint'])
    # 短舱是独立建造的零件，平移到真实的发动机轴线。
    obj=bpy.data.objects[f'发动机短舱_{index}']; obj.location.x=x
    # 原组件位于新喷口之前，防止其内部栅片挡住后方重建的燃烧室与涡轮。
    source_part('eng.Vanes',f'原件改造_涡轮壳_{index}',(x,-2.64,0),(w*1.7,.68,w*1.5),M['metal'])
    cylinder(f'进气口_{index}',(x,1.28,0),w*.67,.07,M['dark'])
    ring(f'进气口唇边_{index}',(x,1.27,0),w*.67,.035,M['metal'])
    for j in range(5): box(f'进气栅_{index}_{j}',(x+(j-2)*w*.2,1.33,0),(.026,.025,w*.84),M['metal'],.006)
    exhaust_nozzle(x,w,index)
    for j in range(6): box(f'短舱散热鳍_{index}_{j}',(x,-1.2-j*.18,.455),(w*1.25,.055,.035),M['dark'],.005)
    for j in range(3):
        plate(f'发动机分段检修甲_{index}_{j}',[(x-w*.70,.48-j*.49),(x+w*.70,.48-j*.49),(x+w*.60,.08-j*.49),(x-w*.60,.08-j*.49)],.46,.07,M['secondary'],.025)
        for side in (-1,1):
            box('动力总成锁扣',(x+side*w*.58,.34-j*.49,.512),(.045,.12,.025),M['metal'],.008)
    for side in (-1,1):
        seam('燃油冷却管线',[(x+side*w*.82,.52,.23),(x+side*w*.96,.12,.25),(x+side*w*.96,-1.5,.25),(x+side*w*.78,-2,.23)],M['metal'],.021)

def flight_systems(cfg):
    """结构沿安装面分层，科幻细节集中在动力、传感与武器系统。"""
    b=cfg['body']
    # 背部能源脊柱：窄发光缝嵌在护甲下，不以发光大面覆盖机身。
    plate('能源脊柱底座',[(-.22,.12),(.22,.12),(.32,-1.7),(.20,-2.55),(-.20,-2.55),(-.32,-1.7)],.65,.13,M['dark'],.03)
    for j in range(6):
        y=-.18-j*.34
        box('脊柱散热装甲',(0,y,.76),(.42,.25,.11),M['paint'],.035)
        for side in (-1,1):
            box('脊柱冷却导光条',(side*.213,y,.703),(.014,.16,.018),M['nav'],.005)
    for side in (-1,1):
        # RCS 姿态控制喷嘴，短舱边缘护板及其嵌入式机械舱。
        x=side*.92*b
        plate('肩部复合装甲',[(x,1.42),(x+side*.34,.68),(x+side*.33,-.38),(x,-.18)],.54,.085,M['secondary'],.026)
        box('姿态喷管安装座',(side*.78*b,1.72,.42),(.22,.45,.18),M['dark'],.035)
        for j in range(2):
            cylinder('姿态喷管钛口',(side*.78*b,1.64+j*.16,.526),.049,.035,M['metal'],axis='Z',vertices=20)
            cylinder('姿态喷管内腔',(side*.78*b,1.64+j*.16,.546),.031,.006,M['dark'],axis='Z',vertices=20)
        # 尾部散热翼片带真实基座和铰链，避免零件漂浮。
        box('折叠散热器基座',(side*.73*b,-2.05,.48),(.22,.98,.11),M['dark'],.025)
        for j in range(5):
            box('折叠散热器叶片',(side*.74*b,-1.73-j*.15,.59),(.36,.04,.16),M['metal'],.009,rot=(0,side*.28,0))
        seam('机鼻陶瓷边梁',[(side*.11,4.67,.17),(side*.28*b,3.92,.31),(side*.45*b,3.12,.43)],M['secondary'],.024)
        box('机鼻测距传感器',(side*.25*b,3.65,.377),(.055,.24,.022),M['glass'],.012)
        # 机身肩部液压检修口，三种尺度：装甲盖、锁扣、紧固件。
        for y in [-.4,-.95]:
            box('液压检修凹槽',(side*.69*b,y,.619),(.22,.38,.022),M['dark'],.023)
            box('检修盖中央锁扣',(side*.69*b,y,.639),(.11,.16,.023),M['metal'],.012)
        if cfg.get('cannon'):
            wx=side*2.8
            for j in range(5):
                box('电磁炮线圈散热套',(wx,.28+j*.27,-.24),(.51,.10,.40),M['metal'],.025)
                box('电磁导轨状态窗',(wx,.28+j*.27,-.024),(.13,.047,.014),M['nav'],.005)
        elif cfg.get('heavy'):
            for j in range(3):
                plate('重装甲外覆陶瓷块',[(side*2.38,-.15-j*.42),(side*2.83,-.32-j*.42),(side*2.94,-.60-j*.42),(side*2.39,-.46-j*.42)],.53,.095,M['paint'],.025)
        elif cfg.get('stealth'):
            for j in range(3):
                plate('隐身翼背导流脊',[(side*(1.65+j*.4),-1.2-j*.26),(side*(1.76+j*.4),-1.42-j*.26),(side*(2.01+j*.4),-2.24-j*.18),(side*(1.9+j*.4),-2.12-j*.18)],.235,.045,M['secondary'],.012)
    # 下部腹鳍与尾部屏蔽甲从侧后方可见。
    for side in [-1,1]:
        plate('尾段热屏蔽肩甲',[(side*.25,-2.48),(side*.55,-2.53),(side*.68,-3.04),(side*.22,-3.10)],.30,.09,M['metal'],.02)
    stencil('CAUTION  /  ION DRIVE',(0,-2.29,.837),.064,M['mark'],'动力检修铭牌')

def hostile_identity(cfg):
    """无人敌军以红黑装甲、三目传感器与矮背鳍建立独立的阵营识别。"""
    b=cfg['body']
    box('敌方三目传感器护罩',(0,2.10,.72),(.80*b,.26,.22),M['dark'],.045)
    for i in [-1,0,1]:
        x=i*.22*b
        cylinder('敌方光电镜头外壳',(x,2.247,.74),.072,.045,M['metal'])
        cylinder('敌方光电镀膜镜片',(x,2.275,.74),.052,.015,M['glass'])
        cylinder('敌方红色光电核心',(x,2.286,.74),.026,.006,M['nav'],vertices=24)
    for side in [-1,1]:
        x=side*1.30*b
        # 低矮后掠散热鳍替代玩家机的大面积垂尾，不引入座舱轮廓。
        profile=[(-.72,.45),(-2.75,.36),(-2.38,1.09),(-1.40,.82)]
        verts=[(x+side*(z-.36)*.40+dx,y,z) for dx in [-.065,.065] for y,z in profile]
        mesh('敌方倾斜散热背鳍',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],M['accent'],.024)
        for j in range(3):
            box('背鳍散热层',(x+side*.13,-1.28-j*.33,.63),(.25,.17,.045),M['metal'],.012)
        # 机肩的红色识别甲沿原安装面放置，远距离俯视也能认出阵营。
        plate('敌方肩部识别甲',[(side*.93*b,1.38),(side*(.93*b+.32),.65),(side*(.93*b+.28),-.32),(side*.93*b,-.12)],.59,.025,M['accent'],.012)
        emblem_x=side*2.48
        for dy,width in [(0,.42),(-.17,.32),(-.34,.22)]:
            seam('敌军三齿徽记',[(emblem_x-side*width/2,-1.4+dy,.226),(emblem_x,-1.53+dy,.226),(emblem_x+side*width/2,-1.4+dy,.226)],M['mark'],.013)
    stencil('UNIT / '+cfg['code'],(0,3.17,.476),.095,M['mark'],'无人编队编号')

def build_kamikaze(cfg):
    """专用三瓣冲撞无人机：中央弹体、径向装甲鳍和单轴主推进器。"""
    loft('冲撞核心承力壳',[(3.6,.09,.11,0),(2.75,.60,.49,0),(1.65,1.04,.79,0),(.10,1.01,.78,0),(-1.45,.86,.71,0),(-2.99,.69,.65,0)],M['paint'],.045)
    loft('前端贯穿装甲锥',[(3.72,.025,.045,0),(3.25,.27,.26,0),(2.50,.64,.54,0),(1.83,.92,.72,0)],M['secondary'],.035)
    # 六瓣红色装甲围绕纵轴包覆，不复用战斗机的翼面、双短舱或航炮。
    for j in range(6):
        angle=j*math.tau/6
        surface=M['accent'] if j%3!=2 else M['secondary']
        stations=[(2.65,.66,.56),(1.65,1.065,.815),(.26,1.04,.805),(-.38,.955,.77)]
        verts=[]
        for depth in [1.07,1.15]:
            for y,rx,rz in stations:
                for a in [angle+.055,angle+math.tau/6-.055]:
                    verts.append((math.cos(a)*rx*depth,y,math.sin(a)*rz*depth))
        faces=[]
        for k in range(3):
            a=k*2
            faces.extend([(a,a+2,a+3,a+1),(a+8,a+9,a+11,a+10),(a,a+8,a+10,a+2),(a+1,a+3,a+11,a+9)])
        faces.extend([(0,1,9,8),(6,14,15,7)])
        mesh(f'冲撞弹体红色包甲_{j}',verts,faces,surface,.018)
        a=angle+math.pi/6
        seam('弹体冷却缝',[(math.cos(a)*.92,-.60,math.sin(a)*.74),(math.cos(a)*.84,-1.5,math.sin(a)*.70),(math.cos(a)*.76,-2.30,math.sin(a)*.67)],M['metal'],.025)
    # 三片径向折叠装甲鳍具有独立铰链与钛合金边缘，形成非传统战斗机剪影。
    for j in range(3):
        a=math.pi/2+j*math.tau/3
        radial=Vector((math.cos(a),0,math.sin(a)))
        tangent=Vector((-math.sin(a),0,math.cos(a)))
        profile=[(.76,1.10),(1.95,1.96),(2.10,.82),(1.05,-1.55),(.76,-1.78)]
        verts=[tuple(radial*r+Vector((0,y,0))+tangent*offset) for offset in [-.075,.075] for r,y in profile]
        n=len(profile)
        faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)]
        mesh(f'三瓣装甲鳍_{j}',verts,faces,M['secondary'],.03)
        # 薄红色外覆板贴合两侧，中心保持深色机械骨架。
        for side in [-1,1]:
            outline=[(1.05,.85),(1.82,1.46),(1.92,.77),(1.17,-.92)]
            vertices=[tuple(radial*r+Vector((0,y,0))+tangent*(side*.083)) for r,y in outline]
            mesh(f'径向鳍红色覆板_{j}_{side}',vertices,[(0,1,2,3)],M['accent'],0)
        seam('冲撞鳍钛合金刃缘',[tuple(radial*r+Vector((0,y,0))) for r,y in profile[1:4]],M['metal'],.025)
        for y in [-.90,-.15,.60]:
            center=radial*.86+Vector((0,y,0))
            hinge=cylinder('径向鳍铰链',tuple(center),.115,.20,M['metal'])
            hinge.rotation_euler=Vector((0,0,1)).rotation_difference(tangent).to_euler()
            box('径向鳍安全锁',tuple(radial*.97+Vector((0,y,0))),(.10,.19,.10),M['accent'],.018)
    # 前端只有环绕式测距窗口；无玻璃座舱、枪管或双垂尾。
    for j in range(6):
        a=j*math.tau/6+math.pi/6
        p=Vector((math.cos(a)*.54,2.82,math.sin(a)*.46))
        box('冲撞测距镜头基座',tuple(p),(.13,.18,.13),M['dark'],.027)
        cylinder('冲撞测距镜片',(p.x,2.923,p.z),.052,.018,M['glass'],vertices=24)
        cylinder('冲撞红色传感器',(p.x,2.937,p.z),.027,.009,M['nav'],vertices=24)
    source_part('eng.Vanes','原件改造_中央推进器壳',(0,-2.63,0),(1.45,.60,1.38),M['metal'])
    for j in range(8):
        a=j*math.tau/8
        p=(math.cos(a)*.80,-1.95,math.sin(a)*.70)
        fin=box('中央推进器散热栅',p,(.13,.76,.065),M['metal'],.012)
        fin.rotation_euler.y=-a
    for side in [-1,1]:
        for j in range(6):
            y=-.85-j*.16
            box('弹体后段冷却百叶',(side*.54,y,.817+y*.045),(.23,.065,.035),M['dark'],.005)
            box('弹体冷却口压条',(side*.54,y+.035,.832+y*.045),(.23,.012,.019),M['metal'],.003)
    exhaust_nozzle(0,1.08,0)
    stencil('72',(0,-1.35,.753),.24,M['mark'],'冲撞无人机编号')
    stencil('AUTONOMOUS',(0,-1.62,.744),.085,M['mark'],'冲撞无人机标记')

def build_fighter(c):
    b=c['body']
    loft('中央承力机身',[(5.35,.055,.07,-.03),(4.1,.32*b,.20,.01),(2.4,.70*b,.36,.08),(.3,1.0*b,.46,.08),(-2.15,.90*b,.37,.04),(-3.1,.64*b,.22,0)],M['dark'],.05)
    loft('机背连续装甲',[(4.8,.085,.08,.13),(3.25,.41*b,.20,.25),(1.5,.72*b,.28,.31),(-.3,.89*b,.31,.29),(-2.5,.62*b,.16,.26)],M['paint'],.045)
    # 侧肩护板与主壳保留装配缝。
    for side in (-1,1):
        plate('机身肩部装甲',[(side*.42,2.9),(side*.86*b,1.1),(side*1.10*b,-.5),(side*.94*b,-2.3),(side*.61,-2.65)],.24,.18,M['paint'])
        wing(side,c)
        box('机背设备舱',(side*.72*b,-1.24,.50),(.23,1.1,.06),M['secondary'],.018)
        for j in range(6): box('机背冷却百叶',(side*.44*b,-.8-j*.20,.58),(.24,.06,.035),M['dark'],.004)
    if not c.get('drone'):
        plate('座舱密封基座',[(-.16,2.85),(.16,2.85),(.41,1.8),(.40,.7),(.25,.24),(-.25,.24),(-.40,.7),(-.41,1.8)],.62,.06,M['dark'],.025)
        canopy()
        box('座舱后隔框',(0,.38,.80),(.57,.065,.08),M['metal'],.02)
    else:
        loft('无人机航电罩',[(3.7,.08,.06,.25),(2.2,.38*b,.23,.47),(.4,.43*b,.28,.54),(-.2,.25*b,.15,.44)],M['secondary'])
        box('敌方红外传感器',(0,2.18,.716),(.38*b,.13,.06),M['nav'],.014)
    engine_positions=[-1.25*b,1.25*b]
    if c.get('quad'): engine_positions += [-2.35*b,2.35*b]
    for i,x in enumerate(engine_positions): engine(x,c,i)
    if not c.get('stealth') and not c.get('drone'):
        for s in (-1,1):
            # 斜置垂尾用有厚度的多面体，侧面与正面都能识别。
            x=s*1.30*b
            verts=[(x-.07,-1.65,.30),(x-.07,-3.05,.28),(x+s*.42-.07,-2.80,1.70),(x+s*.42-.07,-2.28,1.90),
                   (x+.07,-1.65,.30),(x+.07,-3.05,.28),(x+s*.42+.07,-2.80,1.70),(x+s*.42+.07,-2.28,1.90)]
            mesh('外倾垂直尾翼',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],M['secondary'])
            box('尾翼识别条',(x+s*.29,-2.63,1.33),(.16,.32,.13),M['accent'],.015)
            # 外倾面上的检修嵌板沿同一斜面排布；背视也能看见分层尾舵。
            seam('垂尾分段舵缝',[(x+s*.10,-2.85,.48),(x+s*.28,-2.65,1.16),(x+s*.43,-2.46,1.74)],M['dark'],.012)
            seam('垂尾钛合金前缘',[(x+s*.10,-1.81,.38),(x+s*.49,-2.31,1.83)],M['metal'],.018)
            for j in range(3):
                z=.68+j*.16
                box('垂尾根部通风鳍',(x+s*(.15+j*.045),-2.46,z),(.17,.24,.036),M['dark'],.006)
    for s in (-1,1):
        wx=s*(2.80 if not c.get('quad') else 3.5)
        box('武器承力挂架',(wx,-.73,-.13),(.26,1.1,.24),M['secondary'])
        source_part('hardpoint.gun.bracket','原件改造_航炮总成',(wx,-.20,-.25),(.26,2.30,.33),M['metal'])
        if c.get('cannon'):
            box('重型电磁炮壳',(wx,.30,-.27),(.45,2.4,.36),M['secondary'])
            for dx in [-.11,.11]: cylinder('电磁炮导轨',(wx+dx,1.7,-.27),.058,2.1,M['metal'])
        else:
            cylinder('航炮枪管',(wx,.95,-.25),.064,1.15,M['dark'])
    if c.get('heavy'):
        for s in (-1,1):
            plate('重型反应装甲',[(s*1.8,.55),(s*2.9,-.30),(s*3.35,-1.62),(s*1.8,-1.7)],.41,.19,M['secondary'])
            for j in range(3): box('模块化装甲板',(s*2.13,-.35-j*.37,.54),(.45,.28,.09),M['paint'],.025)
    # 顶面工业标记和检修口赋予可读尺度，不用随机装饰填满机体。
    if not c.get('drone'): stencil('RESCUE',(0,3.24,.468),.105,M['accent'],'救援指示')
    for s in (-1,1):
        box('检修口边框',(s*.35,-2.05,.442),(.3,.36,.026),M['dark'],.025)
        box('检修口盖',(s*.35,-2.05,.458),(.265,.325,.018),M['secondary'],.015)
        for j in range(3): box('维修警示短线',(s*.35,-2.11+j*.06,.471),(.14,.012,.005),M['mark'],0)
    flight_systems(c)
    if c.get('drone'): hostile_identity(c)

def build(kind,source_root,destination):
    global M,SOURCE
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # 只引入实际使用的授权组件，其余模型不进入交付物。
    with bpy.data.libraries.load(str(source_root/'Shipyard.blend'),link=False) as (a,b):
        b.objects=['eng.Vanes','hardpoint.gun.bracket','ventPortBlock']
    SOURCE={o.name:o for o in b.objects}
    hidden=bpy.data.collections.new('CC0原件_制作参考'); bpy.context.scene.collection.children.link(hidden)
    for o in SOURCE.values(): hidden.objects.link(o); o.hide_render=True; o.hide_set(True)
    c=FLEET[kind]
    hostile=c.get('drone',False)
    M={'paint':material('主装甲_陶瓷金属涂层',tuple(v*.60 for v in c['paint']),.48 if hostile else .72,.42 if hostile else .30),
       'secondary':material('次级装甲_深色钢',tuple(v*.54 for v in c['paint']),.65,.39),
       'metal':material('拉丝钛合金',(.14,.16,.19) if hostile else (.29,.32,.34),.82 if hostile else .88,.34 if hostile else .27),
       'dark':material('碳化结构与接缝',(.018,.025,.028),.45,.4),
       'accent':material('识别色',c['accent'],.4,.38),
       'mark':material('丝印与编号',(.68,.71,.67),.25,.44),
       'glass':material('镀膜传感器玻璃' if hostile else '镀膜座舱玻璃',(.07,.005,.008) if hostile else (.012,.043,.055),.62,.085),
       'engine':material('热喷口',(.98,.30,.035),.2,.3,3),
       'nav':material('航行灯',(.9,.012,.018) if hostile else (.55,.76,.83),.1,.24,2.5)}
    surface_finish(M['paint'],tuple(v*.47 for v in c['paint']),kind,.44 if hostile else .32)
    M['glass'].node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.85
    if kind=='kamikaze': build_kamikaze(c)
    else: build_fighter(c)
    length=c['length']
    # 先将各零件旋转烘焙进几何，再沿统一的机身纵轴缩放。
    # 否则已旋转 90° 的喷口圆环会沿局部 Y（世界 Z）压扁，与外壳截面不一致。
    parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(bpy.context.scene.objects):
        if o.name in SOURCE or o in hidden.objects.values(): continue
        if o.type=='MESH':
            for v in o.data.vertices: v.co.y*=length
            o.location.y*=length
        elif o.type=='EMPTY': o.location.y*=length
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or obj.hide_render: continue
        uv=obj.data.uv_layers.new(name='军工漆面UV') if not obj.data.uv_layers else obj.data.uv_layers.active
        for face in obj.data.polygons:
            axis=max(range(3),key=lambda i:abs(face.normal[i]))
            axes=[i for i in range(3) if i!=axis]
            for loop_index in face.loop_indices:
                v=obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
                uv.data[loop_index].uv=(v[axes[0]]*.36,v[axes[1]]*.36)
    # 原始组件只作来源保留，不参与源文件预览与运行时导出。
    hidden.hide_render=True; hidden.hide_viewport=True
    scene=bpy.context.scene; scene['asset_source']='Greyoxide Shipyard (CC0) + original armor, wings and cockpit by this project'
    scene['source_url']='https://opengameart.org/content/shipyard'; scene['aircraft']=kind
    destination.mkdir(parents=True,exist_ok=True)
    (destination/'sources').mkdir(exist_ok=True); (destination/'raw').mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(destination/'sources'/f'{kind}.blend'))
    export_objects=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
    for o in export_objects:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    # 同材质合批，源 .blend 则继续保留各个建模部件。
    groups=[(mat,[o for o in export_objects if len(o.data.materials) and o.data.materials[0]==mat]) for mat in M.values()]
    for mat,objects in groups:
        if not objects: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); objects[0].name=mat.name
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        if o.type in {'MESH','EMPTY'} and not o.hide_render: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(destination/'raw'/f'{kind}.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
    print(f'制作完成 {kind}')

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--source-root',type=Path,required=True); parser.add_argument('--destination',type=Path,required=True); parser.add_argument('--only',choices=FLEET)
    args=parser.parse_args()
    for kind in ([args.only] if args.only else FLEET): build(kind,args.source_root,args.destination)
