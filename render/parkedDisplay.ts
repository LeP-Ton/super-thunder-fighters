import * as THREE from "three";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { instantiateShip, ShipAsset } from "./modelLibrary";

/** 起落架与机位标线仅用于停放展示，不进入战斗模型或碰撞计算。 */
export function createParkedDisplay(asset: ShipAsset) {
  const aircraft = new THREE.Group();
  const markings = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const metal = new THREE.MeshStandardMaterial({
    color: "#829098",
    metalness: 0.85,
    roughness: 0.31,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: "#151a1d",
    metalness: 0.08,
    roughness: 0.84,
  });
  const paint = new THREE.MeshBasicMaterial({
    color: "#b7a280",
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: false,
  });
  [metal, rubber, paint].forEach((material) => materials.add(material));

  const ship = instantiateShip(asset, 8.6);
  const hullBounds = new THREE.Box3().setFromObject(ship);
  const hullSize = hullBounds.getSize(new THREE.Vector3());
  const clearance = 0.53;
  ship.position.y = clearance - hullBounds.min.y;
  aircraft.add(ship);

  const wheelRadius = 0.15;
  const tireGeometry = new THREE.TorusGeometry(
    wheelRadius - 0.04,
    0.04,
    10,
    24,
  );
  const hubGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16);
  geometries.add(tireGeometry);
  geometries.add(hubGeometry);

  const strut = (start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      direction.length(),
      12,
    );
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, metal);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    mesh.castShadow = true;
    aircraft.add(mesh);
  };

  const gearLocations = [
    new THREE.Vector3(0, 0, hullBounds.min.z + hullSize.z * 0.27),
    new THREE.Vector3(
      -hullSize.x * 0.15,
      0,
      hullBounds.min.z + hullSize.z * 0.69,
    ),
    new THREE.Vector3(
      hullSize.x * 0.15,
      0,
      hullBounds.min.z + hullSize.z * 0.69,
    ),
  ];
  gearLocations.forEach((location) => {
    const axle = location.clone().setY(wheelRadius);
    const mount = location.clone().setY(clearance + 0.32);
    strut(mount, axle, 0.038);
    strut(mount.clone().add(new THREE.Vector3(0, -0.16, 0.32)), axle, 0.026);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(tireGeometry, rubber);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.copy(axle).add(new THREE.Vector3(side * 0.08, 0, 0));
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      aircraft.add(wheel);
    }
    const hub = new THREE.Mesh(hubGeometry, metal);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(axle);
    hub.castShadow = true;
    aircraft.add(hub);
  });
  aircraft.rotation.y = -0.13;

  const parkingBounds = new THREE.Box3().setFromObject(aircraft);
  // 只在装配时提取轮廓顶点，拖动取景无需遍历数万个原始顶点。
  const hull = new ConvexHull().setFromObject(aircraft);
  const silhouette = new Set<THREE.Vector3>();
  hull.faces.forEach((face) => {
    for (let i = 0; i < 3; i++) silhouette.add(face.getEdge(i).head().point);
  });
  const halfWidth =
    Math.max(Math.abs(parkingBounds.min.x), parkingBounds.max.x) + 0.48;
  const halfLength =
    Math.max(Math.abs(parkingBounds.min.z), parkingBounds.max.z) + 0.5;
  const stripe = (x: number, z: number, width: number, length: number) => {
    const geometry = new THREE.PlaneGeometry(width, length);
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, paint);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.008, z);
    markings.add(mesh);
  };
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfLength, halfLength]) {
      stripe(x - Math.sign(x) * 0.55, z, 1.15, 0.036);
      stripe(x, z - Math.sign(z) * 0.55, 0.036, 1.15);
    }
  }
  // 机鼻前的 T 形引导线给出落地尺度，并明确停机位的朝向。
  stripe(0, -halfLength + 0.45, 0.035, 0.85);
  stripe(0, -halfLength, 0.85, 0.035);

  return {
    aircraft,
    markings,
    bounds: parkingBounds,
    framePoints: [...silhouette],
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

/** 根据实际模型边界和容器纵横比取景，屏幕像素密度不参与物体尺寸。 */
export function frameParkedDisplay(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  framePoints: THREE.Vector3[],
  target: THREE.Vector3,
  interactive: boolean,
) {
  const direction = camera.position.clone().sub(target).normalize();
  const center = bounds.getCenter(new THREE.Vector3());
  const right = new THREE.Vector3()
    .crossVectors(camera.up, direction)
    .normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const horizontal = vertical * camera.aspect;
  const fill = interactive ? 0.82 : 0.88;
  let distance = 0;
  // 包围盒的虚构角点会让扁平战机过小；凸包轮廓可同时保证完整显示和有效占幅。
  for (const point of framePoints) {
    const offset = point.clone().sub(center);
    const depth = offset.dot(direction);
    distance = Math.max(
      distance,
      depth + Math.abs(offset.dot(right)) / (horizontal * fill),
      depth + Math.abs(offset.dot(up)) / (vertical * fill),
    );
  }
  target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
