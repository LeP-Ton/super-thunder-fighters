# 超级雷霆战机：项目认知

## 项目定位与技术

- 本项目是浏览器纵向卷轴射击游戏，支持六架玩家战机、四类敌机、难度选择和机型切换。
- 使用 React 19、TypeScript、Vite 6 和 Three.js；游戏逻辑与 3D 战斗渲染分离。
- 六架玩家战机与四类敌机使用本地 GLB 模型；可编辑 Blender 源文件位于 `assets/model-sources/`。WebGL 2 不可用时使用既有 Canvas 2D 美术资源。
- 默认语言为中文，另支持英语、日语、韩语和俄语。

## 核心架构

- App.tsx 管理游戏状态、输入事件、渲染循环和界面装配；`game/fixedStep.ts` 以 60 Hz 固定时间步驱动战斗更新，画面按浏览器刷新节奏绘制。
- game/ 负责敌机生成、移动、攻击、碰撞、得分和机型特性。
- `render/battleScene.ts` 负责 Three.js 俯视正交场景、GLB 加载、侧倾、弹体与粒子；`render/modelManifest.ts` 维护十类模型与预览资源映射；其他 `render/` 文件保留 Canvas 2D 降级画面。
- components/ 负责 HUD、首页、机库、情报、设置及战斗结果界面。
- planes.ts 定义机型参数；i18n.ts 定义多语言文案；public/assets/ 存放美术资源。
- 战斗逻辑坐标为 600×800，Three.js 正交场景与其一一对应；页面用 CSS 适配屏幕，渲染像素密度最多为 2。视觉侧倾只读取位移速度，不参与碰撞。

## 运行与验证

- 安装依赖：npm install
- 启动开发：npm run dev
- 类型检查：npx tsc --noEmit
- 生产构建：npm run build
- 浏览器验收：启动开发服务器后运行 npm run qa:browser；资产制作与授权见 `assets/model-sources/README.md`。
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
