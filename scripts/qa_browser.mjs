/** 在本机 Chrome 中检查 3D 资源、主要界面和游戏操作。 */
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--enable-webgl", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
const modelResults = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.url().endsWith(".glb"))
    modelResults.push({ url: response.url(), status: response.status() });
});
await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle2" });
await page.waitForSelector(".start-overlay .primary-button:not([disabled])", {
  timeout: 30000,
});
const assetStructure = await page.evaluate(async () => {
  const { modelKinds } = await import("/render/modelManifest.ts");
  const { loadShipAsset } = await import("/render/modelLibrary.ts");
  return Promise.all(
    modelKinds.map(async (kind) => {
      const asset = await loadShipAsset(kind);
      let sockets = 0;
      let meshes = 0;
      asset.scene.traverse((node) => {
        if (node.name.startsWith("exhaust_")) sockets++;
        if (node.isMesh) meshes++;
      });
      return { kind, meshes, sockets };
    }),
  );
});
const renderer = await page.$eval("canvas", (canvas) => {
  const gl = canvas.getContext("webgl2");
  return gl ? gl.getParameter(gl.VERSION) : "Canvas 2D";
});
await page.screenshot({ path: "/private/tmp/super-thunder-home.png" });
await page.locator(".main-nav button:nth-child(1)").click();
await page.waitForFunction(() =>
  document
    .querySelector(".hangar-panel .ship-showcase")
    ?.classList.contains("is-ready"),
);
const hangarPreviews = await page.$$eval(
  ".plane-card-art img",
  (images) =>
    images.filter((image) => image.complete && image.naturalWidth > 0).length,
);
await page.screenshot({ path: "/private/tmp/super-thunder-hangar.png" });
const inspected = [];
for (let index = 1; index <= 6; index++) {
  await page.locator(`.plane-card:nth-child(${index})`).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".hangar-panel .ship-showcase")
      ?.classList.contains("is-ready"),
  );
  inspected.push(
    await page.$eval(".hangar-panel .ship-showcase", (node) =>
      node.getAttribute("aria-label"),
    ),
  );
}
await page.locator(".plane-card:nth-child(1)").click();
await page.locator(".assignment-button").click();
const removed = await page.$eval(
  ".section-heading strong",
  (node) => node.textContent === "2 / 3",
);
await page.locator(".plane-card:nth-child(2)").click();
await page.locator(".assignment-button").click();
const assigned = await page.$eval(
  ".section-heading strong",
  (node) => node.textContent === "3 / 3",
);
// 恢复默认编队后再验证战斗，避免测试改变首发机型。
await page.locator(".assignment-button").click();
await page.locator(".plane-card:nth-child(1)").click();
await page.locator(".assignment-button").click();
for (const slot of [3, 4, 3, 4]) {
  await page.locator(`.plane-card:nth-child(${slot})`).click();
  await page.locator(".assignment-button").click();
}
await page.locator(".modal-header .icon-button").click();
await page.locator(".main-nav button:nth-child(2)").click();
await page.waitForFunction(
  () =>
    [...document.querySelectorAll(".enemy-art img")].length === 4 &&
    [...document.querySelectorAll(".enemy-art img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
);
const intelPreviews = await page.$$eval(
  ".enemy-art img",
  (images) =>
    images.filter((image) => image.complete && image.naturalWidth > 0).length,
);
await page.screenshot({ path: "/private/tmp/super-thunder-intel.png" });
const inspectedEnemies = [];
for (let index = 1; index <= 4; index++) {
  await page.locator(`.enemy-card:nth-child(${index})`).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".intel-panel .ship-showcase")
      ?.classList.contains("is-ready"),
  );
  inspectedEnemies.push(
    await page.$eval(".intel-panel .ship-showcase", (node) =>
      node.getAttribute("aria-label"),
    ),
  );
}
await page.locator(".modal-header .icon-button").click();
await page.locator(".main-nav button:nth-child(3)").click();
const titles = [];
for (let index = 1; index <= 5; index++) {
  await page.locator(`.languages button:nth-child(${index})`).click();
  titles.push(await page.title());
}
await page.locator(".languages button:nth-child(2)").click();
await page.screenshot({ path: "/private/tmp/super-thunder-settings.png" });
await page.locator(".modal-header .icon-button").click();
await page.locator(".start-overlay .primary-button").click();
await new Promise((resolve) => setTimeout(resolve, 3000));
await page.screenshot({ path: "/private/tmp/super-thunder-battle.png" });
await page.keyboard.down("d");
await new Promise((resolve) => setTimeout(resolve, 180));
await page.screenshot({ path: "/private/tmp/super-thunder-bank-right.png" });
await page.keyboard.up("d");
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: "/private/tmp/super-thunder-bank-return.png" });
await page.keyboard.down(" ");
await new Promise((resolve) => setTimeout(resolve, 500));
await page.keyboard.up(" ");
await page.keyboard.press("Escape");
const paused = (await page.$(".pause-overlay")) !== null;
await page.screenshot({ path: "/private/tmp/super-thunder-pause.png" });
if (paused) await page.locator(".pause-overlay .primary-button").click();
const resumed = paused && (await page.$(".pause-overlay")) === null;
await page.keyboard.down(" ");
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = (now) => {
        frames++;
        if (now - start >= 10000)
          resolve(Math.round((frames * 1000) / (now - start)));
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }),
);
await page.keyboard.up(" ");
const bankAngles = await page.evaluate(async () => {
  const { BattleScene } = await import("/render/battleScene.ts");
  const testScene = new BattleScene(document.createElement("canvas"));
  const testState = {
    activePlaneId: "vanguard",
    player: {
      pos: { x: 260, y: 680 },
      size: { x: 60, y: 60 },
      velocity: { x: 6, y: 0 },
    },
    enemies: [],
    bullets: [],
    particles: [],
  };
  for (let frame = 0; frame < 18; frame++)
    testScene.render(testState, 1000 + frame * 16.67);
  const right = testScene.bank;
  testState.player.velocity.x = -6;
  for (let frame = 18; frame < 42; frame++)
    testScene.render(testState, 1000 + frame * 16.67);
  const left = testScene.bank;
  testState.player.velocity.x = 0;
  for (let frame = 42; frame < 102; frame++)
    testScene.render(testState, 1000 + frame * 16.67);
  const centered = testScene.bank;
  testState.activePlaneId = "strider";
  testScene.render(testState, 1000 + 102 * 16.67);
  const switched = testScene.playerKind === "strider";
  // 检查实际 GLB 挂点驱动的尾焰，防止单喷口模型仍出现双尾焰。
  await testScene.loadModels();
  const drone = testScene.makeShip("kamikaze", 40, true);
  const nozzles = [];
  drone.traverse((node) => {
    if (node.name.startsWith("exhaust_"))
      nozzles.push({
        radius: node.userData.radius,
        flameCount: node.children.filter((child) => child.isMesh).length,
        flameWidth: node.children[0]?.scale.x,
      });
  });
  testScene.scene.remove(drone);
  testScene.dispose();
  return { right, left, centered, switched, nozzles };
});
const combatSmoke = await page.evaluate(async () => {
  const { updateGame } = await import("/game/engine.ts");
  const { buildPlaneStates } = await import("/game/state.ts");
  const { PLANE_BY_ID } = await import("/planes.ts");
  const { GameStatus } = await import("/types.ts");
  const plane = PLANE_BY_ID.vanguard;
  const state = {
    player: {
      id: "qa-player",
      pos: { x: 270, y: 680 },
      size: { x: plane.size, y: plane.size },
      velocity: { x: 0, y: 0 },
      health: plane.maxHealth,
      maxHealth: plane.maxHealth,
      type: "player",
    },
    enemies: [],
    bullets: [],
    particles: [],
    score: 0,
    level: 1,
    status: GameStatus.PLAYING,
    difficulty: "normal",
    activePlaneId: "vanguard",
    planeStates: buildPlaneStates("normal"),
    energy: 0,
  };
  let resultStatus = GameStatus.PLAYING;
  const options = {
    status: GameStatus.PLAYING,
    gameStateRef: { current: state },
    defaultPlane: plane,
    touchTargetRef: { current: null },
    autoFire: false,
    setScore() {},
    setLevel() {},
    setEnergy() {},
    setHealth() {},
    setStatus(value) {
      resultStatus = value;
    },
  };
  updateGame({ ...options, time: 1000, keys: { " ": true } });
  const fired = state.bullets.some((bullet) => bullet.owner === "player");
  state.bullets = [
    {
      id: "qa-hit",
      pos: { x: 290, y: 700 },
      velocity: { x: 0, y: 0 },
      damage: 999,
      owner: "enemy",
      color: "#ff0000",
    },
  ];
  updateGame({ ...options, time: 1017, keys: {} });
  return { fired, gameover: resultStatus === GameStatus.GAMEOVER };
});
const title = await page.title();
await page.locator(".brand-lockup").click();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await new Promise((resolve) => setTimeout(resolve, 900));
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await page.screenshot({ path: "/private/tmp/super-thunder-mobile.png" });
await page.locator(".main-nav button:first-child").click();
await page.waitForFunction(() =>
  document
    .querySelector(".hangar-panel .ship-showcase")
    ?.classList.contains("is-ready"),
);
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: "/private/tmp/super-thunder-mobile-hangar.png" });
await browser.close();

const fallbackBrowser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-webgl"],
});
const fallbackPage = await fallbackBrowser.newPage();
await fallbackPage.setViewport({
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
});
await fallbackPage.goto("http://127.0.0.1:3000/", {
  waitUntil: "networkidle2",
});
await fallbackPage.waitForSelector(
  ".start-overlay .primary-button:not([disabled])",
  { timeout: 30000 },
);
const fallback = await fallbackPage.$eval("canvas", (canvas) => ({
  webgl: !!canvas.getContext("webgl2"),
  canvas2d: !!canvas.getContext("2d"),
}));
await fallbackPage.locator(".start-overlay .primary-button").click();
await new Promise((resolve) => setTimeout(resolve, 800));
fallback.playing = (await fallbackPage.$(".stage-pause")) !== null;
await fallbackPage.screenshot({
  path: "/private/tmp/super-thunder-fallback.png",
});
await fallbackBrowser.close();
console.log(
  JSON.stringify(
    {
      renderer,
      assetStructure,
      fps,
      paused,
      resumed,
      bankAngles,
      combatSmoke,
      title,
      titles,
      modelResults,
      hangarPreviews,
      intelPreviews,
      inspected,
      inspectedEnemies,
      removed,
      assigned,
      mobileOverflow,
      fallback,
      errors,
    },
    null,
    2,
  ),
);
if (
  assetStructure.some(
    (item) =>
      item.meshes < 8 ||
      item.sockets !==
        (item.kind === "kamikaze"
          ? 1
          : ["tempest", "super"].includes(item.kind)
            ? 4
            : 2),
  ) ||
  mobileOverflow ||
  !removed ||
  !assigned ||
  inspected.length !== 6 ||
  inspectedEnemies.length !== 4 ||
  fps < 50 ||
  bankAngles.nozzles.length !== 1 ||
  bankAngles.nozzles[0]?.flameCount !== 1 ||
  !(bankAngles.nozzles[0]?.radius > 0.5) ||
  !(bankAngles.nozzles[0]?.flameWidth > 0.38) ||
  !paused ||
  !resumed ||
  title !== "超级雷霆战机" ||
  titles.length !== 5 ||
  new Set(modelResults.map((result) => result.url)).size !== 10 ||
  modelResults.some(
    (result) => result.status !== 200 && result.status !== 304,
  ) ||
  hangarPreviews !== 6 ||
  intelPreviews !== 4 ||
  fallback.webgl ||
  !fallback.canvas2d ||
  !fallback.playing ||
  errors.length ||
  bankAngles.right > -0.25 ||
  bankAngles.left < 0.25 ||
  Math.abs(bankAngles.centered) > 0.02 ||
  !bankAngles.switched ||
  !combatSmoke.fired ||
  !combatSmoke.gameover
) {
  process.exitCode = 1;
}
