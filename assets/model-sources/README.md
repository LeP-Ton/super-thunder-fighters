# 战机 3D 素材来源与重建

## 来源与授权

- 原始模型：Quaternius，Ultimate Spaceships Pack，2021 年 5 月版。
- 官方页面：https://quaternius.com/packs/ultimatespaceships.html
- 作者提供的 OpenGameArt 镜像：https://opengameart.org/content/lowpoly-spaceships-pack
- 原始模型以 CC0 1.0 发布，可免费商用与改造；本仓库保留来源说明，便于核查。完整许可文本：https://creativecommons.org/publicdomain/zero/1.0/

| 游戏类别 | 原模型 |
| --- | --- |
| 先锋号 `vanguard` | Challenger |
| 迅影 `strider` | Spitfire |
| 风暴 `tempest` | Striker |
| 盾卫 `aegis` | Imperial |
| 新星 `nova` | Zenith |
| 幽影 `specter` | Omen |
| 集群拦截机 `grunt` | Bob |
| 自爆无人机 `kamikaze` | Insurgent |
| 精英攻击机 `elite` | Dispatcher |
| 超级战斗机 `super` | Executioner |

## 改造内容

`scripts/build_models.py` 对各机型分别调整比例、阵营配色和金属/粗糙度材质，并沿机身真实表面布置航行灯、检修面板及特殊机型装甲。最终 `.blend` 含贴图，可继续在 Blender 中编辑。运行时 GLB 经 glTF Transform 优化和 WebP 贴图压缩；预览图由同一份最终源文件渲染。

## 重建步骤

1. 从上述来源下载原包并解压，将包含 `Challenger/Blend/Challenger.blend` 等目录的路径作为 `--source-root`。
2. 安装 Blender 4.3 或更新版本的 Python API（`bpy`）、NumPy 和 Pillow，运行：

   `python scripts/build_models.py --source-root <原包目录> --destination <临时输出目录>`

3. 将 `<临时输出目录>/sources/*.blend` 复制至本目录。
4. 对每个 `<临时输出目录>/raw/<类别>.glb` 运行：

   `npx gltf-transform optimize <输入.glb> public/assets/models/<类别>.glb --compress false --instance false --texture-compress webp --texture-size 1024`

5. 对每个最终 `.blend` 运行：

   `python scripts/render_previews.py --source assets/model-sources/<类别>.blend --output public/assets/previews/<类别>.png`

原包不加入仓库；仓库交付经过改造的可编辑源文件、GLB 与预览图。
