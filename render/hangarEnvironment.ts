import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { createHangarDetails } from "./hangarDetails";
import { createHangarTraffic } from "./hangarTraffic";

/** 机库与战机共享世界坐标：地面 y=0，舱门位于 -Z，默认机首朝舱外。 */
export function createHangarEnvironment(invalidate: () => void) {
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let disposed = false;
  const material = (color: string, metalness = 0.65, roughness = 0.52) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
    });
    materials.add(value);
    return value;
  };
  const structure = material("#293239");
  const trim = material("#51585b", 0.8, 0.38);
  const dark = material("#121a20", 0.45, 0.72);
  const wall = material("#353e43", 0.62, 0.58);
  const paint = material("#b79b66", 0.18, 0.78);
  const lamp = new THREE.MeshStandardMaterial({
    color: "#ffc58c",
    emissive: "#ffb067",
    emissiveIntensity: 3,
  });
  materials.add(lamp);
  const whiteLamp = new THREE.MeshStandardMaterial({
    color: "#dbe7ec",
    emissive: "#b6d2e1",
    emissiveIntensity: 2.5,
  });
  materials.add(whiteLamp);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(cube);
  const box = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    surface: THREE.Material,
    cast = false,
  ) => {
    const mesh = new THREE.Mesh(cube, surface);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // 确定性程序纹理提供接缝、细微磨损与粗糙度；不依赖额外网络素材。
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#51585a";
  ctx.fillRect(0, 0, 512, 512);
  let seed = 19;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 7000; i++) {
    const light = random() > 0.5;
    ctx.fillStyle = light ? "rgba(215,222,224,0.045)" : "rgba(4,10,14,0.06)";
    ctx.fillRect(random() * 512, random() * 512, 1 + random() * 18, 1);
  }
  ctx.strokeStyle = "#20292c";
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 510, 510);
  ctx.strokeStyle = "#778083";
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, 502, 502);
  // 嵌入地板的装甲拼缝与检修条，使用低对比纹理保留大面积地面的安静感。
  const plate = (x: number, y: number, width: number, height: number) => {
    ctx.beginPath();
    ctx.moveTo(x + 12, y);
    ctx.lineTo(x + width - 12, y);
    ctx.lineTo(x + width, y + 12);
    ctx.lineTo(x + width, y + height - 12);
    ctx.lineTo(x + width - 12, y + height);
    ctx.lineTo(x + 12, y + height);
    ctx.lineTo(x, y + height - 12);
    ctx.lineTo(x, y + 12);
    ctx.closePath();
    ctx.stroke();
  };
  ctx.strokeStyle = "#303c42";
  ctx.lineWidth = 2;
  plate(27, 32, 458, 190);
  plate(27, 239, 458, 241);
  ctx.strokeStyle = "#636d70";
  ctx.lineWidth = 1;
  plate(30, 35, 452, 184);
  plate(30, 242, 452, 235);
  for (const y of [43, 209, 251, 465])
    for (const x of [39, 473]) {
      ctx.fillStyle = "#29353a";
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = "#7c8483";
      ctx.fillRect(x - 2, y, 4, 1);
    }
  ctx.fillStyle = "#333f43";
  ctx.fillRect(227, 439, 58, 17);
  ctx.fillStyle = "#727974";
  for (let i = 0; i < 6; i++) ctx.fillRect(233 + i * 8, 444, 4, 6);
  for (const x of [14, 498])
    for (const y of [14, 498]) {
      ctx.fillStyle = "#232b2d";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  const deckMap = new THREE.CanvasTexture(canvas);
  deckMap.colorSpace = THREE.SRGBColorSpace;
  deckMap.wrapS = deckMap.wrapT = THREE.RepeatWrapping;
  deckMap.repeat.set(14, 20);
  deckMap.anisotropy = 8;
  textures.add(deckMap);
  const deck = material("#646f76", 0.62, 0.6);
  deck.map = deckMap;
  deck.bumpMap = deckMap;
  deck.bumpScale = 0.055;
  box(0, -0.15, 1, 48, 0.3, 72, deck);

  // 低强度平面反射把机体、舱门和灯光联系到同一块地面；仅在场景变化时更新。
  const reflectionGeometry = new THREE.PlaneGeometry(48, 72);
  geometries.add(reflectionGeometry);
  const reflection = new Reflector(reflectionGeometry, {
    color: 0x7f8991,
    textureWidth: 768,
    textureHeight: 768,
    clipBias: 0.003,
    multisample: 0,
  });
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.set(0, 0.004, 1);
  const renderReflection = reflection.onBeforeRender;
  reflection.onBeforeRender = function (...args) {
    // AO 法线预通道无需再次计算整舱反射，避免每帧重复渲染模型和检修设施。
    if (args[1].overrideMaterial) return;
    renderReflection.apply(this, args);
  };
  const reflectionMaterial = reflection.material as THREE.ShaderMaterial;
  reflectionMaterial.transparent = true;
  reflectionMaterial.depthWrite = false;
  reflectionMaterial.fragmentShader = reflectionMaterial.fragmentShader.replace(
    "vec4 base = texture2DProj( tDiffuse, vUv );",
    `vec2 uv = vUv.xy / vUv.w;
    vec2 blur = vec2(3.5 / 768.0);
    vec4 base = texture2D(tDiffuse, uv) * 0.20;
    base += texture2D(tDiffuse, uv + vec2(blur.x, 0.0)) * 0.12;
    base += texture2D(tDiffuse, uv - vec2(blur.x, 0.0)) * 0.12;
    base += texture2D(tDiffuse, uv + vec2(0.0, blur.y)) * 0.12;
    base += texture2D(tDiffuse, uv - vec2(0.0, blur.y)) * 0.12;
    base += texture2D(tDiffuse, uv + blur) * 0.08;
    base += texture2D(tDiffuse, uv - blur) * 0.08;
    base += texture2D(tDiffuse, uv + vec2(blur.x, -blur.y)) * 0.08;
    base += texture2D(tDiffuse, uv + vec2(-blur.x, blur.y)) * 0.08;`,
  );
  reflectionMaterial.fragmentShader = reflectionMaterial.fragmentShader.replace(
    "#include <colorspace_fragment>",
    "#include <colorspace_fragment>\ngl_FragColor.a = 0.055;",
  );
  group.add(reflection);

  // 出舱导轨与嵌入式导航灯在同一地面上收敛到真实舱口。
  for (const side of [-1, 1]) {
    box(side * 6.8, 0.015, -7, 0.18, 0.025, 42, dark);
    box(side * 6.8, 0.031, -7, 0.035, 0.012, 42, trim);
    for (let z = -25; z <= 13; z += 3.5) {
      box(side * 8, 0.035, z, 0.2, 0.04, 0.65, dark);
      box(side * 8, 0.059, z, 0.075, 0.01, 0.4, lamp);
    }
    for (let z = -26; z < 14; z += 4)
      box(side * 10, 0.02, z, 0.045, 0.018, 2.6, paint);
    // 深色墙板与外露工字梁，以少量重复组件保持尺度一致。
    box(side * 22, 8, 0, 0.4, 16, 64, wall);
    for (let z = -28; z <= 26; z += 7) {
      box(side * 20.8, 7, z, 0.48, 14, 0.8, trim, true);
      box(side * 21.15, 7, z, 0.9, 14.4, 0.18, structure);
      box(side * 20.4, 1.1, z + 2, 0.5, 1.6, 2.2, dark);
      box(side * 20.1, 4.6, z + 2, 0.1, 0.09, 2.5, whiteLamp);
      for (let y = 6; y < 12; y += 1.2)
        box(side * 21.65, y, z + 3.2, 0.08, 0.05, 4.8, dark);
    }
  }
  box(0, 15.4, 0, 44, 0.7, 64, dark);
  for (let z = -28; z <= 22; z += 7) {
    box(0, 13.8, z, 43, 0.65, 0.5, structure);
    box(0, 13.45, z, 43, 0.09, 0.9, trim);
    for (const side of [-1, 1]) {
      const brace = box(side * 18.7, 12.15, z, 4.7, 0.22, 0.25, trim, true);
      brace.rotation.z = (side * Math.PI) / 4;
    }
    for (const x of [-12, 0, 12]) box(x, 13.38, z, 5, 0.045, 0.12, whiteLamp);
  }
  // 舱门的实体边框、检修层与门槛。
  for (const side of [-1, 1]) {
    box(side * 18, 7, -28, 3.4, 14, 2.4, structure, true);
    box(side * 16.2, 7, -26.7, 0.28, 14, 0.35, trim);
    box(side * 16.45, 6, -26.45, 0.12, 10.5, 0.08, whiteLamp);
    for (let y = 0.8; y < 13; y += 1.3)
      box(side * 17.3, y, -26.6, 1.2, 0.22, 0.5, dark);
  }
  box(0, 13.8, -28, 38, 1.4, 2.8, structure, true);
  box(0, 12.98, -26.6, 32, 0.12, 0.12, whiteLamp);
  box(0, 0.08, -27.7, 34, 0.16, 1.1, trim);
  for (let x = -15; x <= 15; x += 1.2)
    box(x, 0.17, -27.7, 0.58, 0.02, 0.45, paint);

  // 地面检修格栅与停机区外的器材箱。
  for (const x of [-12, 12]) {
    box(x, 0.03, 5, 1.2, 0.04, 13, dark);
    for (let z = -1; z <= 11; z += 0.22)
      box(x, 0.06, z, 1.15, 0.018, 0.055, trim);
    for (let i = 0; i < 3; i++) {
      box(
        x + Math.sign(x) * 3,
        0.6,
        -16 + i * 2.4,
        2,
        1.2,
        1.5,
        structure,
        true,
      );
      box(x + Math.sign(x) * 3, 1.25, -16 + i * 2.4, 2.1, 0.1, 1.6, trim);
    }
  }

  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || child.geometry !== cube) continue;
    const key = `${(child.material as THREE.Material).uuid}:${child.castShadow}`;
    const batch = batches.get(key) ?? [];
    batch.push(child);
    batches.set(key, batch);
    group.remove(child);
  }
  for (const batch of batches.values()) {
    const instances = new THREE.InstancedMesh(
      cube,
      batch[0].material,
      batch.length,
    );
    instances.castShadow = batch[0].castShadow;
    instances.receiveShadow = true;
    batch.forEach((mesh, index) => {
      mesh.updateMatrix();
      instances.setMatrixAt(index, mesh.matrix);
    });
    group.add(instances);
  }

  const details = createHangarDetails();
  group.add(details.group);
  const traffic = createHangarTraffic(invalidate);
  group.add(traffic.group);
  let serviceClearance = 0;

  const outside = new THREE.Group();
  group.add(outside);
  const globeGeometry = new THREE.SphereGeometry(85, 96, 64);
  geometries.add(globeGeometry);
  const globeMaterial = new THREE.MeshBasicMaterial({
    color: "#d6e2eb",
    fog: false,
  });
  materials.add(globeMaterial);
  const planet = new THREE.Mesh(globeGeometry, globeMaterial);
  planet.position.set(-12, -72, -143);
  planet.rotation.set(0.25, 0.4, -0.2);
  outside.add(planet);
  const planetMap = new THREE.TextureLoader().load(
    "/assets/environments/ocean-theater.png",
    () => {
      if (disposed) {
        planetMap.dispose();
        return;
      }
      invalidate();
    },
  );
  planetMap.colorSpace = THREE.SRGBColorSpace;
  globeMaterial.map = planetMap;
  textures.add(planetMap);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color("#73acd0") } },
    vertexShader: `varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n; varying vec3 v; uniform vec3 tint; void main(){float rim=pow(1.0-abs(dot(normalize(n),normalize(v))),5.0);gl_FragColor=vec4(tint,0.1+rim*0.65);}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.add(atmosphereMaterial);
  const atmosphere = new THREE.Mesh(globeGeometry, atmosphereMaterial);
  atmosphere.position.copy(planet.position);
  atmosphere.scale.setScalar(1.012);
  outside.add(atmosphere);

  const sun = new THREE.DirectionalLight("#f5e6d0", 1.2);
  sun.position.set(-18, 26, -38);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -18,
    right: 18,
    top: 18,
    bottom: -18,
    near: 1,
    far: 90,
  });
  sun.shadow.normalBias = 0.015;
  sun.shadow.bias = -0.0001;
  group.add(sun, sun.target);
  group.add(new THREE.HemisphereLight("#b0c7d6", "#38434b", 1.35));
  const overhead = new THREE.DirectionalLight("#d9e7f1", 0.8);
  overhead.position.set(2, 15, 8);
  group.add(overhead);
  const rim = new THREE.DirectionalLight("#ffbe88", 1.0);
  rim.position.set(12, 4, -12);
  group.add(rim);

  // 大面光在装甲上形成连续高光，避免小零件在硬直射光下变成一片黑白噪点。
  RectAreaLightUniformsLib.init();
  const key = new THREE.RectAreaLight("#d5e9f4", 3.5, 11, 8);
  key.position.set(-3, 9, 2);
  key.lookAt(0, 0, 0);
  const service = new THREE.RectAreaLight("#ffc999", 2, 5, 5);
  service.position.set(9, 5, -3);
  service.lookAt(0, 1, 0);
  group.add(key, service);

  return {
    group,
    update(
      time: number,
      delta: number,
      clearLane: boolean,
      reducedMotion: boolean,
    ) {
      serviceClearance = reducedMotion
        ? clearLane
          ? 1
          : 0
        : THREE.MathUtils.damp(serviceClearance, clearLane ? 1 : 0, 5, delta);
      details.update(reducedMotion ? 0 : time, serviceClearance);
      traffic.update(time, !reducedMotion);
      return !reducedMotion;
    },
    dispose() {
      disposed = true;
      details.dispose();
      traffic.dispose();
      group.children.forEach((child) => {
        if (child instanceof THREE.InstancedMesh) child.dispose();
      });
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      textures.forEach((value) => value.dispose());
      sun.shadow.dispose();
      reflection.dispose();
    },
  };
}

/** 相机从机尾上方看向舱口；布局仅调整同一场景的构图，不移动战机。 */
export function frameHangarCamera(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  home: boolean,
) {
  camera.aspect = width / height;
  camera.clearViewOffset();
  const mobile = width < 641;
  camera.fov = home ? 40 : 35;
  const distance = home
    ? Math.max(28, 17 / camera.aspect)
    : Math.max(20, 24 / camera.aspect);
  const direction = new THREE.Vector3(
    mobile ? 0.22 : 0.38,
    0.29,
    1,
  ).normalize();
  const target = new THREE.Vector3(0, 1.1, home && mobile ? 0 : -1.8);
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  if (home) {
    // 负偏移将机位放在右侧；上下留给导航与编队，手机保持居中。
    camera.setViewOffset(
      width,
      height,
      mobile
        ? 0
        : -width * Math.min(0.2, Math.max(0, (camera.aspect - 0.8) * 0.2)),
      -height * (mobile ? 0.015 : 0.1),
      width,
      height,
    );
  }
  camera.updateProjectionMatrix();
}
