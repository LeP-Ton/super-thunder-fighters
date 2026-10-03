# 超级雷霆战机

硬核科幻风格的浏览器纵向卷轴射击游戏。玩家可从六架战机中选择三架出战，在战斗中积累能量并切换机型。

## 本地运行

需要 Node.js。

- 安装依赖：npm install
- 启动开发服务器：npm run dev
- 类型检查：npx tsc --noEmit
- 生产构建：npm run build
- 浏览器验收：先运行开发服务器，再运行 npm run qa:browser（需要本机 Chrome）

## 操作

- 桌面：WASD 或方向键移动，空格或 Enter 开火，数字键 1–3 切换战机，Esc 暂停。
- 手机：在战场拖动战机移动，自动开火；能量满时点击下方战机切换，点击战场右下角暂停。

## 画面与素材

- React 负责界面，Three.js WebGL 负责俯视 3D 战斗画面；战斗规则仍按 60 Hz 固定时间步和 600×800 逻辑坐标运行。
- 六架玩家战机、四类敌机的 GLB 位于 `public/assets/models/`，可编辑的 Blender 源文件位于 `assets/model-sources/`，同源预览图位于 `public/assets/previews/`。
- 首页、机库和敌机情报使用同源实时 3D 检视，支持拖动旋转。战场使用低轨海洋、分层云雾、环境反射和辉光。
- WebGL 2 不可用时，使用同一批最终模型生成的俯视图与 Canvas 2D 特效。
- 军工模型来源、CC0 授权及重建流程见 `assets/model-sources/README.md`。
