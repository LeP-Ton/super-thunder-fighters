/** 检查检修关节、舱外航线与切机交接；保存实际浏览器动作片段。 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
const output =
  process.env.QA_OUTPUT || "/private/tmp/super-thunder-hangar-motion";
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--enable-webgl", "--enable-unsafe-swiftshader"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const result = { errors: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => result.errors.push(e.message));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle2" });
  await page.waitForSelector(".hero-model .is-ready");
  result.geometry = await page.evaluate(async () => {
    const THREE = await import("/node_modules/.vite/deps/three.js");
    const { HangarTransfer } = await import("/render/hangarTransfer.ts");
    const { loadShipAsset } = await import("/render/modelLibrary.ts");
    const { createHangarDetails } = await import("/render/hangarDetails.ts");
    const { createHangarTraffic } = await import("/render/hangarTraffic.ts");
    const kinds = ["vanguard", "strider", "aegis", "nova", "tempest"];
    const assets = await Promise.all(kinds.map((k) => loadShipAsset(k)));
    let sourceDisposals = 0;
    assets.forEach((a) =>
      a.scene.traverse((n) => {
        if (n.isMesh)
          n.geometry.addEventListener("dispose", () => sourceDisposals++);
      }),
    );
    const states = [];
    const motion = new HangarTransfer(() => states.push(motion.snapshot()));
    const advance = (s) => {
      for (let i = 0; i < Math.ceil(s * 60); i++) motion.update(1 / 60);
    };
    const select = (i) => {
      motion.request(kinds[i]);
      motion.prepare(kinds[i], assets[i]);
    };
    select(0);
    motion.rotateBy(8.3);
    advance(1);
    select(1);
    advance(0.6);
    const departure = [];
    for (let i = 0; i < 45; i++) {
      motion.update(1 / 60);
      departure.push(motion.snapshot());
    }
    // 起飞期间改选两次，只有最后已准备好的目标进入机位。
    select(2);
    select(3);
    advance(2.2);
    const arriving = motion.snapshot();
    const floor = [];
    for (let i = 0; i < 180; i++) {
      motion.update(1 / 60);
      if (motion.phase === "arriving")
        floor.push(motion.snapshot().position[1]);
    }
    const final = motion.snapshot();
    // 请求尚未加载的资源时不能提前飞走；允许重新选回现有机型。
    motion.request("strider");
    advance(8);
    const waiting = motion.snapshot();
    select(3);
    select(4);
    advance(0.2);
    select(3);
    advance(1);
    const cancelled = motion.snapshot();
    select(4);
    advance(1);
    motion.finishImmediately();
    const reduced = motion.snapshot();
    motion.dispose();
    const details = createHangarDetails();
    const pose = () => {
      details.group.updateMatrixWorld(true);
      return [-1, 1].map(
        (s) =>
          details.group.getObjectByName(`检修臂_${s}`).children[0].rotation.z,
      );
    };
    details.update(0, 0);
    const armsBefore = pose();
    details.update(2, 0);
    const armsAfter = pose();
    details.update(2, 1);
    const armsRetracted = pose();
    details.dispose();
    const traffic = createHangarTraffic(() => {});
    await new Promise((r) => setTimeout(r, 50));
    traffic.update(0, true);
    const initialHidden = !traffic.group.visible;
    traffic.update(11, true);
    const outside = traffic.group.children.map((n) => n.position.toArray());
    const passing = traffic.group.visible;
    traffic.update(18, true);
    const intervalHidden = !traffic.group.visible;
    traffic.update(11, false);
    const reducedHidden = !traffic.group.visible;
    traffic.dispose();
    return {
      states,
      departure,
      arriving,
      final,
      floor,
      waiting,
      cancelled,
      reduced,
      sourceDisposals,
      armsBefore,
      armsAfter,
      armsRetracted,
      initialHidden,
      passing,
      outside,
      intervalHidden,
      reducedHidden,
    };
  });
  const g = result.geometry;
  assert.equal(g.arriving.currentKind, "nova");
  assert.equal(g.arriving.phase, "arriving");
  assert.equal(g.final.currentKind, "nova");
  assert.equal(g.final.ready, true);
  assert.ok(g.departure.every((s) => s.position[2] < 0 && s.position[1] > 0));
  assert.ok(
    g.departure
      .filter((s) => s.position[2] > -28)
      .every((s) => s.position[1] < 1.7),
  );
  assert.ok(g.floor.every((y) => y === 0));
  assert.equal(g.waiting.currentKind, "nova");
  assert.equal(g.waiting.phase, "parked");
  assert.equal(g.cancelled.ready, true);
  assert.equal(g.cancelled.currentKind, "nova");
  assert.equal(g.reduced.currentKind, "tempest");
  assert.equal(g.reduced.ready, true);
  assert.equal(g.sourceDisposals, 0);
  assert.notDeepEqual(g.armsBefore, g.armsAfter);
  assert.notDeepEqual(g.armsAfter, g.armsRetracted);
  assert.ok(
    g.initialHidden && g.passing && g.intervalHidden && g.reducedHidden,
  );
  assert.ok(g.outside.every((p) => p[2] < -28));
  console.log("几何、状态机、连续改选、延迟资源与减弱动态检查通过");
  // 重新打开以固定演示时序，录制环境动作以及一次完整的出舱/滑入。
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector(".hero-model .is-ready");
  await page.evaluate(() => {
    const canvas = document.querySelector(".hero-model canvas");
    const chunks = [];
    const recorder = new MediaRecorder(canvas.captureStream(30), {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 3500000,
    });
    window.__motionRecording = new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
      };
    });
    window.__stopMotionRecording = () => recorder.stop();
    recorder.start();
  });
  await page.screenshot({ path: `${output}/home.png` });
  await sleep(9500);
  await page.screenshot({ path: `${output}/flyby.png` });
  const identity = await page.$(".hero-model canvas");
  await page.click(".formation-card:nth-child(2)");
  await page.waitForSelector('.hero-model [data-phase="departing"]');
  await sleep(700);
  await page.screenshot({ path: `${output}/departing.png` });
  await page.waitForSelector('.hero-model [data-phase="arriving"]');
  await sleep(1300);
  await page.screenshot({ path: `${output}/arriving.png` });
  await page.waitForSelector(".hero-model .is-ready");
  await page.screenshot({ path: `${output}/parked.png` });
  await page.evaluate(() => window.__stopMotionRecording());
  await writeFile(
    `${output}/hangar-motion.webm`,
    Buffer.from(await page.evaluate(() => window.__motionRecording), "base64"),
  );
  assert.ok(await page.evaluate((canvas) => canvas.isConnected, identity));
  result.homeFinal = await page.$eval(".hero-model .showcase-canvas", (n) => ({
    ...n.dataset,
  }));
  assert.equal(result.homeFinal.shipKind, "tempest");
  // 弹窗遮挡首页时，动作暂停；关掉弹窗后继续完成同一交接。
  await page.click(".formation-card:nth-child(3)");
  await page.waitForSelector('.hero-model [data-phase="departing"]');
  await page.click(".main-nav button:first-child");
  const frozen = await page.$eval(
    ".hero-model .showcase-canvas",
    (n) => n.dataset.phase,
  );
  await sleep(3300);
  assert.equal(
    await page.$eval(".hero-model .showcase-canvas", (n) => n.dataset.phase),
    frozen,
  );
  await page.waitForSelector(".hangar-panel .is-ready");
  await page.click(".plane-card:nth-child(2)");
  await page.click(".plane-card:nth-child(4)");
  await page.click(".plane-card:nth-child(6)");
  await page.waitForSelector(".hangar-panel .is-ready");
  result.rapidFinal = await page.$eval(
    ".hangar-panel .showcase-canvas",
    (n) => ({ ...n.dataset }),
  );
  assert.equal(result.rapidFinal.shipKind, "specter");
  await page.click(".modal-header .icon-button");
  await page.waitForSelector(".hero-model .is-ready");
  result.pauseResume = true;
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.click(".formation-card:nth-child(1)");
  await page.waitForSelector(".hero-model .is-ready");
  result.reducedMotion = await page.$eval(
    ".hero-model .showcase-canvas",
    (n) => ({ ...n.dataset }),
  );
  assert.equal(result.reducedMotion.shipKind, "vanguard");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await sleep(400);
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(result.errors, []);
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await sleep(500);
  // 统计真正发生 WebGL 绘制的帧，区分 30 FPS 环境限帧与切机的完整刷新率。
  const measure = (duration) =>
    page.evaluate(async (duration) => {
      const gl = document
        .querySelector(".hero-model canvas")
        .getContext("webgl2");
      let drawn = false;
      const originals = new Map();
      for (const method of [
        "drawElements",
        "drawArrays",
        "drawElementsInstanced",
        "drawArraysInstanced",
      ]) {
        originals.set(method, gl[method]);
        gl[method] = function (...args) {
          drawn = true;
          return originals.get(method).apply(this, args);
        };
      }
      const start = performance.now();
      let frames = 0;
      const result = await new Promise((resolve) => {
        const sample = (now) => {
          if (drawn) frames++;
          drawn = false;
          if (now - start < duration) requestAnimationFrame(sample);
          else
            resolve({
              renderedFrames: frames,
              seconds: (now - start) / 1000,
              renderFps: (frames * 1000) / (now - start),
            });
        };
        requestAnimationFrame(sample);
      });
      originals.forEach((original, method) => {
        gl[method] = original;
      });
      return result;
    }, duration);
  result.ambientPerformance = await measure(3000);
  const transitionMeasurement = measure(5700);
  await page.click(".formation-card:nth-child(2)");
  result.transitionPerformance = await transitionMeasurement;
  await page.waitForSelector(".hero-model .is-ready");
  console.log(
    JSON.stringify({
      ambient: result.ambientPerformance,
      transition: result.transitionPerformance,
    }),
  );
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(result, null, 2),
  );
  assert.ok(
    result.ambientPerformance.renderFps >= 24 &&
      result.ambientPerformance.renderFps <= 33,
  );
  assert.ok(result.transitionPerformance.renderFps >= 45);
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      output,
      homeFinal: result.homeFinal,
      rapidFinal: result.rapidFinal,
      pauseResume: result.pauseResume,
      errors: result.errors,
    }),
  );
} finally {
  await browser.close();
}
