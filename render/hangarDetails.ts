import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** 舱室的检修层、机械层与标识层；重复零件按几何/材质实例化。 */
export function createHangarDetails() {
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const mat = (color: string, metalness = 0.7, roughness = 0.42) => {
    const value = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
    });
    materials.add(value);
    return value;
  };
  const steel = mat("#61717a", 0.85, 0.32);
  const armor = mat("#343f48", 0.65, 0.51);
  const edge = mat("#7b8789", 0.72, 0.38);
  const dark = mat("#121e26", 0.48, 0.62);
  const ceramic = mat("#a0a69e", 0.35, 0.57);
  const orange = mat("#c57f40", 0.4, 0.51);
  const warm = mat("#ffd19a", 0.1, 0.5);
  warm.emissive.set("#ffb875");
  warm.emissiveIntensity = 2;
  const ice = mat("#9ecbd6", 0.1, 0.4);
  ice.emissive.set("#71a9bd");
  ice.emissiveIntensity = 1.8;
  const unitBox = new THREE.BoxGeometry();
  const roundedBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.055);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 20);
  [unitBox, roundedBox, unitCylinder].forEach((g) => geometries.add(g));
  const meshes: THREE.Mesh[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    surface: THREE.Material,
    position: [number, number, number],
    scale: [number, number, number],
    shadow = false,
  ) => {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = shadow;
    meshes.push(mesh);
    return mesh;
  };
  const box = (
    position: [number, number, number],
    size: [number, number, number],
    surface: THREE.Material,
    rounded = false,
    shadow = false,
  ) => add(rounded ? roundedBox : unitBox, surface, position, size, shadow);
  const rod = (
    start: [number, number, number],
    end: [number, number, number],
    radius: number,
    surface: THREE.Material,
  ) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const center = a.clone().add(b).multiplyScalar(0.5);
    const mesh = add(unitCylinder, surface, center.toArray(), [
      radius,
      a.distanceTo(b),
      radius,
    ]);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return mesh;
  };
  const beam = (
    a: [number, number, number],
    b: [number, number, number],
    width: number,
    depth: number,
    surface: THREE.Material,
  ) => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const mesh = box(
      center.toArray(),
      [width, start.distanceTo(end), depth],
      surface,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return mesh;
  };

  // 共用一张标识图集：文字有工业用途，细线与状态条提供近看时的尺度参照。
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const headings = [
    "07 / ORBITAL",
    "FLIGHT SYSTEMS",
    "SERVICE / 02",
    "CAUTION",
  ];
  const subheads = [
    "LAUNCH BAY  •  DECK A",
    "VECTOR DRIVE / STANDBY",
    "ROBOTIC MAINTENANCE",
    "KEEP LAUNCH LANE CLEAR",
  ];
  for (let row = 0; row < 4; row++) {
    const y = row * 256;
    ctx.fillStyle = "#15242d";
    ctx.fillRect(0, y, 1024, 256);
    ctx.fillStyle = row === 3 ? "#d49c62" : "#b6ced2";
    ctx.fillRect(32, y + 34, 8, 176);
    ctx.font = "600 75px sans-serif";
    ctx.fillText(headings[row], 66, y + 112);
    ctx.font = "25px monospace";
    ctx.fillStyle = "#7b9da9";
    ctx.fillText(subheads[row], 68, y + 163);
    ctx.fillRect(67, y + 189, 888, 2);
    for (let i = 0; i < 17; i++) {
      ctx.fillStyle = i < 11 ? "#8bbac6" : "#314652";
      ctx.fillRect(68 + i * 35, y + 205, 25, 6);
    }
    ctx.fillStyle = "#d49c62";
    ctx.font = "22px monospace";
    ctx.fillText(`ST—0${row + 1} / READY`, 680, y + 216);
  }
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  textures.add(atlas);
  const signMaterial = new THREE.MeshStandardMaterial({
    map: atlas,
    emissiveMap: atlas,
    emissive: "#b9dbe4",
    emissiveIntensity: 0.45,
    metalness: 0.15,
    roughness: 0.6,
  });
  materials.add(signMaterial);
  const signGeometries = headings.map((_, row) => {
    const geometry = new THREE.PlaneGeometry();
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) + 3 - row) / 4);
    geometries.add(geometry);
    return geometry;
  });
  const sign = (
    row: number,
    p: [number, number, number],
    width: number,
    tilt = 0,
  ) => {
    const backing = box(
      [p[0], p[1] + Math.sin(tilt) * 0.045, p[2] - Math.cos(tilt) * 0.045],
      [width + 0.15, width / 4 + 0.15, 0.08],
      dark,
      true,
    );
    const face = add(signGeometries[row], signMaterial, p, [
      width,
      width / 4,
      1,
    ]);
    backing.rotation.x = face.rotation.x = tilt;
    return face;
  };

  // 双层八角形舱框、外露闭锁机构与液压缸，构成舱口的主轮廓。
  const portal: [number, number][] = [
    [-16, 0.25],
    [-16, 9.6],
    [-13.4, 12.4],
    [13.4, 12.4],
    [16, 9.6],
    [16, 0.25],
  ];
  for (const z of [-26.1, -25.4]) {
    for (let i = 1; i < portal.length; i++) {
      const a = portal[i - 1],
        b = portal[i];
      beam(
        [a[0], a[1], z],
        [b[0], b[1], z],
        z < -26 ? 0.48 : 0.19,
        0.32,
        z < -26 ? steel : ceramic,
      );
    }
  }
  sign(0, [-6, 13.62, -26.5], 8.5);
  for (const side of [-1, 1]) {
    for (let y = 1.4; y < 12; y += 2.1) {
      box([side * 17.3, y, -26.05], [1.25, 1.28, 0.32], dark, true);
      box([side * 17.3, y + 0.18, -25.82], [0.78, 0.65, 0.2], armor, true);
      rod(
        [side * 17.3, y - 0.52, -25.61],
        [side * 17.3, y + 0.52, -25.61],
        0.1,
        steel,
      );
      box([side * 16.87, y, -25.71], [0.12, 0.38, 0.16], orange);
    }
    rod([side * 18.45, 1, -26.35], [side * 18.45, 11.7, -26.35], 0.16, steel);
    rod([side * 18.45, 2, -26.35], [side * 18.45, 7.8, -26.35], 0.24, armor);
    sign(3, [side * 18, 9.5, -25.5], 2.1);
  }

  // 墙面按结构跨距重复：可拆护板、冷却管线、通风百叶、检修走廊和扶手。
  for (const side of [-1, 1]) {
    for (let z = -23; z <= 23; z += 7) {
      box([side * 21.58, 7.8, z], [0.13, 7.9, 5.8], dark);
      for (let y = 5.1; y < 11; y += 2.2) {
        box([side * 21.38, y, z], [0.18, 1.88, 5.4], armor, true);
        for (const dz of [-2.35, 2.35]) {
          box([side * 21.19, y, z + dz], [0.17, 1.5, 0.1], steel);
          box([side * 21.07, y + 0.51, z + dz], [0.07, 0.17, 0.17], orange);
        }
      }
      box([side * 21.12, 2.6, z], [0.32, 1.5, 3.95], dark, true);
      for (let j = 0; j < 11; j++)
        box(
          [side * 20.89, 2.6, z - 1.66 + j * 0.33],
          [0.14, 1.18, 0.095],
          steel,
        );
      for (const y of [11.85, 12.35]) {
        rod(
          [side * 20.95, y, z - 3.35],
          [side * 20.95, y, z + 3.35],
          0.11,
          steel,
        );
        for (const dz of [-2.8, 0, 2.8])
          box([side * 20.95, y, z + dz], [0.35, 0.34, 0.13], dark);
      }
      // 左右走廊离机位足够远，所有检视角度仍保留完整翼尖。
      box([side * 19.9, 3.7, z], [2.55, 0.18, 6.8], armor, false, true);
      rod(
        [side * 18.65, 4.68, z - 3.4],
        [side * 18.65, 4.68, z + 3.4],
        0.05,
        edge,
      );
      rod(
        [side * 18.65, 4.19, z - 3.4],
        [side * 18.65, 4.19, z + 3.4],
        0.025,
        steel,
      );
      for (const dz of [-3.3, 0, 3.3])
        rod(
          [side * 18.65, 3.75, z + dz],
          [side * 18.65, 4.7, z + dz],
          0.04,
          edge,
        );
    }
    // 近地管线和连接法兰，采用圆柱而不是贴图线条。
    for (const y of [0.7, 1.13]) {
      rod([side * 20.9, y, -24], [side * 20.9, y, 22], 0.16, armor);
      for (let z = -23; z < 23; z += 3.5)
        rod(
          [side * 20.9, y, z - 0.065],
          [side * 20.9, y, z + 0.065],
          0.22,
          steel,
        );
    }
  }

  // 顶部轨道吊架与斜撑；功能件形成大中小三个层级，避免满屏同样密度的细线。
  for (const x of [-10.6, 10.6]) {
    box([x, 12.95, 0], [0.45, 0.55, 55], armor);
    box([x, 12.64, 0], [0.62, 0.1, 55], steel);
    for (let z = -23; z < 22; z += 7) {
      box([x, 12.43, z], [0.9, 0.34, 1.8], dark, true);
      box([x, 12.22, z], [0.72, 0.06, 1.15], ice);
    }
  }
  for (let z = -24; z <= 18; z += 7) {
    for (let x = -17; x <= 17; x += 3.4) {
      beam([x, 14.65, z], [x + 1.6, 13.95, z], 0.09, 0.11, steel);
      beam([x + 1.6, 13.95, z], [x + 3.2, 14.65, z], 0.09, 0.11, steel);
    }
    for (const x of [-6.2, 6.2]) {
      box([x, 14.85, z], [2.1, 0.2, 5.3], armor, true);
      for (let j = 0; j < 8; j++)
        box([x, 14.71, z - 1.9 + j * 0.54], [1.7, 0.035, 0.065], dark);
    }
  }

  // 近景检修臂：基座、旋转关节、双连杆、液压杆与末端诊断夹具。
  for (const side of [-1, 1]) {
    const x = side * 7.3;
    const z = -6.0;
    box([x, 0.18, z], [1.65, 0.36, 1.85], dark, true, true);
    box([x, 0.55, z], [1.1, 0.42, 1.25], armor, true, true);
    add(unitCylinder, steel, [x, 0.91, z], [0.46, 0.27, 0.46]);
    const a: [number, number, number] = [x, 1.12, z];
    const b: [number, number, number] = [x + side * 0.85, 2.86, z - 0.3];
    const c: [number, number, number] = [x - side * 0.6, 3.3, z - 1.5];
    beam(a, b, 0.49, 0.54, ceramic);
    beam(b, c, 0.37, 0.42, armor);
    rod(
      [x - side * 0.2, 1.22, z + 0.29],
      [x + side * 0.52, 2.59, z + 0.06],
      0.07,
      steel,
    );
    rod(
      [x - side * 0.2, 1.22, z + 0.29],
      [x + side * 0.17, 1.95, z + 0.17],
      0.13,
      dark,
    );
    for (const p of [a, b, c]) {
      rod([p[0], p[1], p[2] - 0.32], [p[0], p[1], p[2] + 0.32], 0.28, steel);
      rod([p[0], p[1], p[2] + 0.33], [p[0], p[1], p[2] + 0.38], 0.18, orange);
    }
    box([c[0], c[1] - 0.23, c[2]], [0.53, 0.29, 0.67], dark, true);
    box([c[0], c[1] - 0.4, c[2]], [0.34, 0.035, 0.44], ice);
    sign(2, [x, 1.04, z + 0.66], 0.83);
    // 设备车与落地诊断台。
    const cartX = side * 10.1;
    box([cartX, 0.62, 2.8], [1.45, 1.04, 1.65], armor, true, true);
    for (const dx of [-0.55, 0.55])
      for (const dz of [-0.59, 0.59])
        rod(
          [cartX + dx - 0.1, 0.19, 2.8 + dz],
          [cartX + dx + 0.1, 0.19, 2.8 + dz],
          0.17,
          dark,
        );
    for (let i = 0; i < 3; i++)
      box([cartX, 0.42 + i * 0.25, 3.635], [1.12, 0.17, 0.04], steel, true);
    box([cartX, 1.35, 2.8], [1.28, 0.28, 0.9], dark, true);
    sign(1, [cartX, 1.55, 3.1], 1.1, -0.4);
    box([cartX, 1.9, 2.61], [0.055, 0.44, 0.055], orange);
    box([cartX, 2.14, 2.61], [0.085, 0.07, 0.085], warm);
  }

  // 环绕停机位的分段检修环与装甲嵌板，与 y=0 的接地点共面。
  const pad: [number, number][] = [
    [-4.9, -6.6],
    [4.9, -6.6],
    [6.0, -5.3],
    [6.0, 4.7],
    [4.8, 6],
    [-4.8, 6],
    [-6.0, 4.7],
    [-6.0, -5.3],
  ];
  for (let i = 0; i < pad.length; i++) {
    const a = pad[i],
      b = pad[(i + 1) % pad.length];
    const line = beam(
      [a[0], 0.017, a[1]],
      [b[0], 0.017, b[1]],
      0.045,
      0.045,
      steel,
    );
    line.scale.z = 0.018;
  }
  for (const side of [-1, 1]) {
    for (let z = -5.0; z < 5; z += 1.7) {
      box([side * 5.72, 0.02, z], [0.22, 0.03, 0.6], dark);
      box([side * 5.72, 0.037, z], [0.042, 0.008, 0.35], ice);
    }
    for (let z = -19; z < -8; z += 2.2) {
      const chevron = box(
        [side * 0.38, 0.025, z],
        [0.07, 0.012, 0.74],
        ceramic,
      );
      chevron.rotation.y = -side * 0.62;
    }
    for (const z of [-7.5, 7.5]) {
      box([side * 4.7, 0.012, z], [2.8, 0.02, 0.7], dark);
      for (let i = 0; i < 6; i++) {
        const stripe = box(
          [side * 4.7 - 1.1 + i * 0.43, 0.027, z],
          [0.18, 0.012, 0.51],
          orange,
        );
        stripe.rotation.y = 0.5;
      }
    }
  }
  sign(0, [-3.6, 0.04, 5.1], 2.2, -Math.PI / 2);

  const batches = new Map<string, THREE.Mesh[]>();
  for (const mesh of meshes) {
    const key = `${mesh.geometry.uuid}:${(mesh.material as THREE.Material).uuid}:${mesh.castShadow}`;
    const batch = batches.get(key) ?? [];
    batch.push(mesh);
    batches.set(key, batch);
  }
  for (const batch of batches.values()) {
    const instances = new THREE.InstancedMesh(
      batch[0].geometry,
      batch[0].material,
      batch.length,
    );
    instances.castShadow = batch[0].castShadow;
    instances.receiveShadow = true;
    batch.forEach((mesh, i) => {
      mesh.updateMatrix();
      instances.setMatrixAt(i, mesh.matrix);
    });
    group.add(instances);
  }
  return {
    group,
    dispose() {
      group.children.forEach((child) => {
        if (child instanceof THREE.InstancedMesh) child.dispose();
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
