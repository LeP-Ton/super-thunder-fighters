import * as THREE from "three";
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
  // 停放时关闭发动机高温发光；克隆材质以免改变战斗中的共享喷口。
  const parkedMaterials = new Map<THREE.Material, THREE.Material>();
  ship.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const parkedMaterial = (source: THREE.Material) => {
      if (
        !(source instanceof THREE.MeshStandardMaterial) ||
        !source.name.includes("热喷口")
      )
        return source;
      if (!parkedMaterials.has(source)) {
        const clone = source.clone();
        clone.color.set("#302b27");
        clone.emissiveIntensity = 0.12;
        parkedMaterials.set(source, clone);
        materials.add(clone);
      }
      return parkedMaterials.get(source)!;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(parkedMaterial)
      : parkedMaterial(node.material);
  });
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
  aircraft.rotation.y = 0;

  const parkingBounds = new THREE.Box3().setFromObject(aircraft);
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
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
