import { EnemySubType, PlaneId } from '../types';

export type ShipKind = PlaneId | EnemySubType;

// 十架机体分别使用不同的可商用 CC0 模型，统一由战斗与预览共用。
export const modelFiles: Record<ShipKind, string> = {
  vanguard: '/assets/models/vanguard.glb',
  strider: '/assets/models/strider.glb',
  tempest: '/assets/models/tempest.glb',
  aegis: '/assets/models/aegis.glb',
  nova: '/assets/models/nova.glb',
  specter: '/assets/models/specter.glb',
  grunt: '/assets/models/grunt.glb',
  kamikaze: '/assets/models/kamikaze.glb',
  elite: '/assets/models/elite.glb',
  super: '/assets/models/super.glb'
};

export const modelKinds = Object.keys(modelFiles) as ShipKind[];

export const modelPreviews = Object.fromEntries(
  modelKinds.map((kind) => [kind, `/assets/previews/${kind}.png`])
) as Record<ShipKind, string>;
