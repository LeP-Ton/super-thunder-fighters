# 场景美术

两张场景使用本会话内置 ImageGen 生成，无第三方图片拼贴：

- `orbital-hangar.png`：会话-3/4 的宽屏轨道机库背景，作为历史素材保留；当前首页与机体检视使用实时 3D 舱室。
- `ocean-theater.png`：垂直俯视低轨海洋，用于战场、战术区缩略图和 3D 机库舱外行星表面。

生成模式：内置 `image_gen`，新建图像，不引用旧版本美术。游戏中的战机为独立 GLB 实时渲染，不在背景图中。

## 提示词

### 轨道机库

Use case: stylized-concept. Asset type: final background plate for a premium realistic military science fiction game menu, landscape 16:9, 2048x1152. Completely new art direction. A vast, empty orbital aircraft maintenance hangar, physically convincing dark graphite steel architecture, restrained industrial design, huge open bay on the right revealing a luminous pale blue planet's atmosphere and distant warm sun. Camera low inside the hangar looking toward the opening; floor extends across the foreground and middle with fine wear, recessed warm amber runway lights and soft reflections. Right two thirds are open empty landing deck where a separately rendered fighter will be placed. Left third is dark quiet negative space for menu typography. Cinematic high-end hard-surface concept art with photorealistic materials, strong large-scale structure, volumetric light shafts, subtle atmospheric depth, elegant muted graphite, cold slate blue, warm orange light only. Detailed but not visually noisy. No spacecraft, no people, no text, no letters, no symbols, no HUD, no logos, no watermark. Avoid bright neon, cartoon, low-poly, fantasy nebula, artificial glowing outlines.

### 低轨海洋

Use case: stylized-concept. Asset type: final vertical environment background for a photorealistic military science fiction top-down flying combat game, portrait 3:4, 1536x2048. A satellite looking straight down at a dark ocean planet from low orbit: immense steel-blue storm systems and delicate cloud banks, fragmented dark rocky coastlines near the far left and right edges, a few faint amber industrial city lights along the distant coast. Center 55 percent remains calm open dark ocean and thin atmospheric haze so small spacecraft and bright projectiles will read clearly. Convincing huge scale, real aerial photography quality, detailed cloud forms and geological surfaces, cinematic blue-gray atmosphere, subtle warm sunlight at the upper right. Rich contrast but restrained saturation. Flat nadir aerial perspective with NO horizon, NO curved planet edge. No spaceships, no aircraft, no explosions, no people, no text, no grids, no UI, no stars, no logos. Avoid nebula fantasy, bright cyan neon, toy landscape and excessive busy details. This is a finished production environment plate, clean dark readable central combat lane.

## 实时 3D 机库

会话-5 的可编辑环境源为 `render/hangarEnvironment.ts`：程序建模的地板、工字梁、斜撑、舱门、出舱导轨、器材箱及检修格栅。地板接缝与磨损纹理由确定性 Canvas 绘制生成，无新增外部素材。舱外行星复用上述自有低轨海洋图，叠加大气层着色；地面使用低强度平面反射。停放机首沿 -Z 指向舱门，起落架与地板统一为 y=0。
