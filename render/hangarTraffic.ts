import * as THREE from "three";
import { instantiateShip, loadShipAsset } from "./modelLibrary";

/** 舱口以外的低频巡航编队；复用 GLB 缓存，不参与战斗或碰撞。 */
export function createHangarTraffic(invalidate: () => void) {
  const group = new THREE.Group();
  group.name = "舱外巡航编队";
  group.visible = false;
  let disposed = false;
  let loaded = false;
  const ships: THREE.Group[] = [];
  const geometry = new THREE.ConeGeometry(0.14, 2.3, 12, 1, true);
  const material = new THREE.MeshBasicMaterial({
    color: "#a6ddff",
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  loadShipAsset("vanguard")
    .then((asset) => {
      if (disposed) return;
      for (let i = 0; i < 3; i++) {
        const ship = instantiateShip(asset, 4.4);
        ship.traverse((node) => {
          if (node instanceof THREE.Mesh)
            node.castShadow = node.receiveShadow = false;
        });
        const exhausts: THREE.Object3D[] = [];
        ship.traverse((node) => {
          if (node.name.startsWith("exhaust_")) exhausts.push(node);
        });
        for (const socket of exhausts) {
          const flame = new THREE.Mesh(geometry, material);
          flame.rotation.x = Math.PI / 2;
          flame.position.z = 1.15;
          socket.add(flame);
        }
        group.add(ship);
        ships.push(ship);
      }
      loaded = true;
      invalidate();
    })
    .catch(() => {
      /* 巡航是环境装饰，加载失败不影响主机型展示。 */
    });
  return {
    group,
    update(time: number, enabled: boolean) {
      const elapsed = time - 7;
      const cycle = Math.floor(Math.max(0, elapsed) / 26);
      const phase = ((elapsed % 26) + 26) % 26;
      const visible = enabled && loaded && elapsed >= 0 && phase < 8;
      const changed = group.visible !== visible;
      group.visible = visible;
      if (!visible) return changed;
      const direction = cycle % 2 === 0 ? 1 : -1;
      ships.forEach((ship, index) => {
        ship.visible = cycle % 2 === 0 || index < 2;
        ship.position.set(
          direction * (-48 + phase * 12 - index * 4.5),
          5.6 + index * 1.15 + Math.sin(phase * 0.4) * 0.45,
          -43 - index * 3.3,
        );
        ship.rotation.set(0, (-direction * Math.PI) / 2, direction * 0.08);
      });
      return true;
    },
    dispose() {
      disposed = true;
      group.clear();
      geometry.dispose();
      material.dispose();
      // 机体几何与材质仍由 modelLibrary 持有。
    },
  };
}
