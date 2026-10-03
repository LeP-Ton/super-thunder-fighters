import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { modelFiles, ShipKind } from "./modelManifest";

export type ShipAsset = {
  scene: THREE.Group;
  center: THREE.Vector3;
  size: THREE.Vector3;
};

const pending = new Map<ShipKind, Promise<ShipAsset>>();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// 首页、机库和战场共享下载与解析结果；各自的实例只保留变换。
export function loadShipAsset(kind: ShipKind): Promise<ShipAsset> {
  let result = pending.get(kind);
  if (!result) {
    result = loader.loadAsync(modelFiles[kind]).then(({ scene }) => {
      const bounds = new THREE.Box3().setFromObject(scene);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      return {
        scene,
        center: bounds.getCenter(new THREE.Vector3()),
        size: bounds.getSize(new THREE.Vector3()),
      };
    });
    pending.set(kind, result);
    result.catch(() => pending.delete(kind));
  }
  return result;
}

export function instantiateShip(asset: ShipAsset, extent: number): THREE.Group {
  const group = new THREE.Group();
  const model = asset.scene.clone(true);
  model.position.copy(asset.center).multiplyScalar(-1);
  group.add(model);
  group.scale.setScalar(extent / Math.max(asset.size.x, asset.size.z));
  return group;
}
