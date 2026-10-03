# 军工战机：素材来源与制作流程

## 来源与许可

- 机械组件：Greyoxide 的 **Shipyard**，由 bart 发布于 [OpenGameArt](https://opengameart.org/content/shipyard)。
- 原文件：[Shipyard.blend.zip](https://opengameart.org/sites/default/files/Shipyard.blend.zip)。
- 原站明确标记 **CC0**，允许免费商用、修改和再分发；[完整许可](https://creativecommons.org/publicdomain/zero/1.0/)。
- 实际使用 `eng.Vanes` 发动机组件和 `hardpoint.gun.bracket` 武器组件，重新调整比例、结构、倒角与材质。原件保留在每个源文件的隐藏参考集合中。
- 机身、机翼、曲面座舱、垂尾、装甲接缝、检修盖、喷口、工业标记与 PBR 表面贴图由本项目重新制作。
- 本次资产已替换上一版 Quaternius 飞船。旧版可从 Git 检查点 `4a9ea5a` 恢复。

## 十类设计

| 类别 | 结构特征 |
| --- | --- |
| 先锋号 `vanguard` | 双引擎、后掠三角翼、曲面风挡、橙色识别条 |
| 迅影 `strider` | 前掠翼、狭长机身、轻型挂架 |
| 风暴 `tempest` | 四引擎、紧凑机身、绿色军用涂装 |
| 盾卫 `aegis` | 宽体、模块化重装甲、沙色涂装 |
| 新星 `nova` | 加长双侧电磁炮、重型炮架 |
| 幽影 `specter` | 无垂尾大展弦比飞翼、深色隐身涂装 |
| 集群拦截机 `grunt` | 紧凑无人机、封闭航电罩、红色传感器 |
| 自爆无人机 `kamikaze` | 狭长刺形机身、大角度前掠翼 |
| 精英攻击机 `elite` | 前掠重型无人机、双侧电磁导轨 |
| 超级战斗机 `super` | 四引擎宽体、重型反应装甲、深色舰体 |

## 资产约定

- 源 `.blend` 保留可编辑部件和打包的基色、粗糙度、法线贴图。
- Blender 中 Z 向上，机首 +Y；GLB 中 Y 向上，机首 -Z。
- `exhaust_0` 等空节点是尾焰挂点，局部 +Z 指向喷口后方，禁止在优化时删除。
- 导出时按材质合并为 9 个绘制批次；GLB 使用 Meshopt 几何压缩与 WebP 贴图。浏览器加载器已配置随 Three.js 本地提供的解码器。
- 斜视预览与 Canvas 2D 俯视图均从同一份最终模型生成。敌方俯视图由运行时旋转 180°。

## 精细结构

- 会话-6 增加分区翼面蒙皮、三段倒角、连续曲面风挡与压框、封闭后舱、背部能源脊柱、冷却管线、姿态控制喷嘴、检修锁扣与尾舵接缝。
- 矢量喷口包含中空收敛段、18 片外部瓣片、内部涡轮、燃烧室热环与液压连杆；Shipyard 外壳前移，避免遮挡新建内腔。
- 重型机增加复合陶瓷装甲，电磁炮机增加线圈散热套，隐身机增加低矮导流脊；保留十种机型各自的轮廓与动力布局。
- 当前单机约 6.6–10.6 万三角面；所有新部件在 `.blend` 中保留独立名称和修改器。预览按投影包围盒取景，避免前掠翼或宽翼被裁切。

## 重建

本次使用 Blender Python API 5.2.2、NumPy、Pillow。解压原始 `Shipyard.blend` 后运行：

```sh
python scripts/build_models.py --source-root <包含Shipyard.blend的目录> --destination <输出目录>
cp <输出目录>/sources/*.blend assets/model-sources/
node scripts/optimize_models.mjs <输出目录>/raw
```

然后为每个机型生成两种视图：

```sh
python scripts/render_previews.py --source assets/model-sources/vanguard.blend --output public/assets/previews/vanguard.png
python scripts/render_previews.py --source assets/model-sources/vanguard.blend --output public/assets/ships/vanguard.png --top
```

建模脚本支持 `--only vanguard` 等参数；预览脚本支持 `--hero` 输出大幅检视图，`--rear` 输出后侧视图检查喷口。优化脚本特意关闭 `flatten`、`join` 和 `prune`，避免挂点被移除。
