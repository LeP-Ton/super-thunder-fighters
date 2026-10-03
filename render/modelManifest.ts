import { EnemySubType, PlaneId } from '../types';

export type ShipKind = PlaneId | EnemySubType;

// 十架机体由 CC0 机械组件与自制装甲构成；战斗、展示和降级预览共用。
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
