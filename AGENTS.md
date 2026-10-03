# 超级雷霆战机：项目认知

## 项目定位与技术

- 本项目是浏览器纵向卷轴射击游戏，支持六架玩家战机、四类敌机、难度选择和机型切换。
- 使用 React 19、TypeScript、Vite 6 和 Three.js；游戏逻辑与 3D 战斗渲染分离。
- 六架玩家战机与四类敌机使用本地 GLB 模型；可编辑 Blender 源文件位于 `assets/model-sources/`。WebGL 2 不可用时使用同一批最终模型生成的 Canvas 2D 俯视图。
- 默认语言为中文，另支持英语、日语、韩语和俄语。

## 核心架构

- App.tsx 管理游戏状态、输入事件、渲染循环和界面装配；`game/fixedStep.ts` 以 60 Hz 固定时间步驱动战斗更新，画面按浏览器刷新节奏绘制。
- game/ 负责敌机生成、移动、攻击、碰撞、得分和机型特性。
- `render/battleScene.ts` 负责 Three.js 俯视正交场景、侧倾、辉光、尾焰、弹体与粒子；`render/modelLibrary.ts` 统一缓存 GLB 下载与解析；`render/modelManifest.ts` 维护十类模型与预览资源映射；其他 `render/` 文件保留 Canvas 2D 降级画面。
- components/ 负责 HUD、首页、机库、情报、设置及战斗结果界面；`ShipShowcase` 用同一 GLB 进行实时三维检视，模型几何和材质由共享库持有，视图销毁时只释放自己的展示几何/材质、渲染器、环境与阴影资源。
- planes.ts 定义机型参数；i18n.ts 定义多语言文案；public/assets/ 存放美术资源。
- 战斗逻辑坐标为 600×800，Three.js 正交场景与其一一对应；页面用 CSS 适配屏幕，战斗像素密度最多为 1.5，展示最多为 1.75。视觉侧倾只读取位移速度，不参与碰撞。

## 美术资产约定

- `scripts/build_models.py` 使用 Greyoxide Shipyard CC0 机械组件并重新制作机身与 PBR 材质；`scripts/optimize_models.mjs` 输出 Meshopt 压缩 GLB，加载器使用本地解码器。
- Blender 坐标 Z 向上、机首 +Y；GLB 坐标 Y 向上、机首 -Z。`exhaust_*` 空节点是喷口挂点，优化不能移除；数量由模型决定（自爆无人机 1 个，其余 2/4 个），挂点 `radius` 元数据用于尾焰宽度，导出须保留 extras。
- 首页/机库/情报共用实时 3D 展示；斜视缩略图和俯视降级图由 `scripts/render_previews.py` 生成，禁止独立更换成不匹配的机体图片。
- `render/hangarEnvironment.ts` 构建首页、机库和情报共用的 3D 舱室、地板、结构梁、舱门、行星与平面反射；所有物体共用世界坐标，地面 y=0、舱口位于 -Z。`frameHangarCamera` 按容器尺寸固定取景，加载和切机不得改变相机构图。
- `render/hangarDetails.ts` 负责可重复的检修设施、机械件与标识图集，按几何/材质实例化并释放自身资源。展示通过 `ShipShowcase` 的 EffectComposer、GTAO（环境遮蔽）和 OutputPass 绘制；环境遮蔽按 CSS 分辨率计算，静止时不重复绘制，不进入战斗渲染链。
- `render/parkedDisplay.ts` 仅负责展示用起落架、机位标线与停放材质；不能改变战斗模型或碰撞。机首默认朝 -Z，检视时只旋转机体。展示材质有变化时必须克隆，禁止修改共享模型材质。
- `ShipShowcase` 将场景生命周期与机型加载分离，切机复用场景和画布；冷启动直接显示 3D 舱室，静态模型预览仅用于 WebGL 不可用或模型失败的降级。
- 展示 Canvas 的 CSS 尺寸必须与 DPR（设备像素比）渲染缓冲区分离；取景按容器尺寸统一计算，验收需覆盖高分屏与跨屏 DPR 变化。
- 场景位于 `public/assets/environments/`；模型来源与制作步骤见 `assets/model-sources/README.md`，生成场景提示词见场景目录 README。

## 运行与验证

- 安装依赖：npm install
- 启动开发：npm run dev
- 类型检查：npx tsc --noEmit
- 生产构建：npm run build
- 浏览器验收：启动开发服务器后运行 npm run qa:browser；资产制作与授权见 `assets/model-sources/README.md`。
- 模型几何验收：在安装 Blender Python API 的环境运行 `python scripts/qa_model_sources.py`，检查十类模型的喷口圆度、同轴关系和专用无人机结构。
- 停放展示回归：启动开发服务器后运行 npm run qa:parking，检查高分屏画布、十种机型接地与拖动取景；包含延迟 GLB 下载的冷启动检查，结果默认保存在 `/private/tmp/super-thunder-hangar-3d/`。
- 桌面端使用 WASD/方向键移动、空格/Enter 开火、1–3 切换机型、Esc 暂停；触屏端拖动战机并自动开火。

## 开发规范与检索

1. 先读取本文件，了解项目定位、架构和运行方式。
2. 再读取 .agentdocs/index.md，定位相关变更。
3. 只读取当前任务相关的 .agentdocs/workflow/ 文档。
4. 最后针对性检索源码。
5. 每次实际代码变更新建一个带精确时间前缀的 workflow 文档，并更新索引。
6. AGENTS.md 只保存长期稳定认知；具体需求与变更记录放在 .agentdocs/workflow/。
7. 保持战斗数值、碰撞范围与视觉绘制职责分离；更新美术时检查机库与情报预览。
8. 与用户沟通、文档和代码注释使用中文；注释解释非直观实现的原因。
