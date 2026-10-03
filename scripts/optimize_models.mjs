/** 优化几何与贴图，但保留尾焰挂点的空节点。 */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const source = process.argv[2];
if (!source)
  throw new Error("用法：node scripts/optimize_models.mjs <原始 GLB 目录>");
for (const file of readdirSync(source).filter((file) =>
  file.endsWith(".glb"),
)) {
  execFileSync(
    "./node_modules/.bin/gltf-transform",
    [
      "optimize",
      path.join(source, file),
      `public/assets/models/${file}`,
      "--compress",
      "meshopt",
      "--flatten",
      "false",
      "--join",
      "false",
      "--instance",
      "false",
      "--palette",
      "false",
      "--prune",
      "false",
      "--texture-compress",
      "webp",
      "--texture-size",
      "1024",
    ],
    { stdio: "pipe" },
  );
  console.log(`优化完成：${file}`);
}
