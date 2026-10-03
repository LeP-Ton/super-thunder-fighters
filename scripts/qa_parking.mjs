/** 检查高分屏展示尺寸、停放接地和十种机型的旋转取景。 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const output = process.env.QA_OUTPUT || "/private/tmp/super-thunder-parking";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--enable-webgl", "--enable-unsafe-swiftshader"],
});
const results = { dimensions: [], models: [], selections: [], errors: [] };
const settle = () => new Promise((resolve) => setTimeout(resolve, 250));
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => results.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") results.errors.push(message.text());
  });
  const ready = async (selector) => {
    await page.waitForSelector(`${selector} .ship-showcase.is-ready`);
    await settle();
  };
  const checkDimensions = async (selector) => {
    const result = await page.$eval(`${selector} .showcase-canvas`, (host) => {
      const canvas = host.querySelector("canvas");
      const bounds = host.getBoundingClientRect();
      const rect = canvas.getBoundingClientRect();
      return {
        viewport: [innerWidth, innerHeight],
        dpr: devicePixelRatio,
        host: [bounds.width, bounds.height],
        canvas: [rect.width, rect.height],
        buffer: [canvas.width, canvas.height],
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    for (let axis = 0; axis < 2; axis++) {
      assert.ok(
        Math.abs(result.host[axis] - result.canvas[axis]) < 1,
        "画布 CSS 尺寸必须等于容器",
      );
      assert.ok(
        Math.abs(
          result.buffer[axis] - result.host[axis] * Math.min(result.dpr, 1.75),
        ) < 2,
        "像素密度只影响缓冲区",
      );
    }
    assert.equal(result.overflow, false, "页面不能产生横向溢出");
    results.dimensions.push({ selector, ...result });
  };
  await page.setViewport({ width: 1511, height: 818, deviceScaleFactor: 2 });
  await page.goto(process.env.QA_URL || "http://127.0.0.1:3000/", {
    waitUntil: "networkidle2",
  });
  await ready(".hero-model");
  // 连续切换像素密度，包含 CSS 尺寸不变的跨屏场景。
  for (const [width, height, deviceScaleFactor] of [
    [1511, 818, 1],
    [1511, 818, 1.25],
    [1511, 818, 1.75],
    [1511, 818, 2],
    [1920, 1080, 2],
    [1280, 720, 2],
    [390, 844, 3],
  ]) {
    await page.setViewport({ width, height, deviceScaleFactor });
    await settle();
    await checkDimensions(".hero-model");
    if (width === 390) await page.screenshot({ path: `${output}/mobile.png` });
  }
  await page.setViewport({ width: 1511, height: 818, deviceScaleFactor: 2 });
  await settle();
  await page.screenshot({ path: `${output}/home.png` });
  for (const [nav, panel, card, count] of [
    [1, ".hangar-panel", ".plane-card", 6],
    [2, ".intel-panel", ".enemy-card", 4],
  ]) {
    await page.click(`.main-nav button:nth-child(${nav})`);
    await ready(panel);
    for (let index = 1; index <= count; index++) {
      await page.click(`${card}:nth-child(${index})`);
      await ready(panel);
      await checkDimensions(panel);
      results.selections.push(
        await page.$eval(`${panel} .ship-showcase`, (node) =>
          node.getAttribute("aria-label"),
        ),
      );
    }
    await page.click(`${card}:nth-child(1)`);
    await ready(panel);
    await page.screenshot({
      path: `${output}/${nav === 1 ? "hangar" : "intel"}.png`,
    });
    const canvas = await page.$(`${panel} .showcase-canvas canvas`);
    const before = await canvas.screenshot();
    const bounds = await canvas.boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.6,
      bounds.y + bounds.height * 0.55,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.35,
      bounds.y + bounds.height * 0.62,
      { steps: 14 },
    );
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const after = await canvas.screenshot();
    assert.ok(!before.equals(after), "拖动应当改变检视角度");
    await page.screenshot({
      path: `${output}/${nav === 1 ? "hangar" : "intel"}-rotated.png`,
    });
    await page.click(".modal-header .icon-button");
  }
  results.models = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { modelKinds } = await import("/render/modelManifest.ts");
    const { loadShipAsset } = await import("/render/modelLibrary.ts");
    const { createParkedDisplay, frameParkedDisplay } = await import(
      "/render/parkedDisplay.ts"
    );
    const models = [];
    for (const kind of modelKinds) {
      const display = createParkedDisplay(await loadShipAsset(kind));
      const vertices = [];
      display.aircraft.updateMatrixWorld(true);
      display.aircraft.traverse((node) => {
        if (!node.isMesh) return;
        const positions = node.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i++) {
          vertices.push(
            new THREE.Vector3()
              .fromBufferAttribute(positions, i)
              .applyMatrix4(node.matrixWorld),
          );
        }
      });
      let maxProjected = 0;
      let cases = 0;
      // 使用全部真实顶点独立验证，防止仅验证取景算法自己的轮廓数据。
      for (const aspect of [0.9, 1.55, 2.37]) {
        for (const rotation of [0, 0.7, 2.3, 4.6]) {
          const matrix = new THREE.Matrix4().makeRotationY(rotation);
          const points = display.framePoints.map((point) =>
            point.clone().applyMatrix4(matrix),
          );
          const bounds = new THREE.Box3().setFromPoints(points);
          const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
          const target = new THREE.Vector3();
          camera.position.set(7.6, 4.8, -9.4);
          frameParkedDisplay(camera, bounds, points, target, true);
          camera.updateMatrixWorld(true);
          for (const vertex of vertices) {
            const point = vertex.clone().applyMatrix4(matrix).project(camera);
            maxProjected = Math.max(
              maxProjected,
              Math.abs(point.x),
              Math.abs(point.y),
            );
            if (point.z <= -1 || point.z >= 1)
              throw new Error(`${kind} 超出相机裁剪面`);
          }
          cases++;
        }
      }
      models.push({
        kind,
        vertices: vertices.length,
        outlineVertices: display.framePoints.length,
        floor: display.bounds.min.y,
        maxProjected,
        cases,
      });
      display.dispose();
    }
    return models;
  });
  assert.equal(results.models.length, 10);
  for (const model of results.models) {
    assert.ok(Math.abs(model.floor) < 0.002, `${model.kind} 起落架需要接地`);
    assert.ok(model.maxProjected <= 0.821, `${model.kind} 旋转后不能裁切`);
  }
  assert.deepEqual(results.errors, []);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        output,
        dimensions: results.dimensions.length,
        selections: results.selections,
        modelCases: results.models.reduce((sum, item) => sum + item.cases, 0),
        errors: results.errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
