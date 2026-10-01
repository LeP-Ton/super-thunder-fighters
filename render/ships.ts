import { COLORS } from '../constants';
import { Bullet, EnemySubType, PlaneId } from '../types';

export const shipAssets: Record<PlaneId | EnemySubType, string> = {
  vanguard: '/assets/ships/vanguard.png',
  strider: '/assets/ships/strider.png',
  tempest: '/assets/ships/tempest.png',
  aegis: '/assets/ships/aegis.png',
  nova: '/assets/ships/nova.png',
  specter: '/assets/ships/specter.png',
  grunt: '/assets/ships/grunt.png',
  kamikaze: '/assets/ships/kamikaze.png',
  elite: '/assets/ships/elite.png',
  super: '/assets/ships/super.png'
};

export type ProjectileVisual = 'plasma' | 'missile' | 'enemy';

const projectileAssets: Record<ProjectileVisual, string> = {
  plasma: '/assets/projectiles/plasma.png',
  missile: '/assets/projectiles/missile.png',
  enemy: '/assets/projectiles/enemy.png'
};

const playerProjectileColors: Record<PlaneId, string> = {
  vanguard: '#63d9ff',
  strider: '#a9f4ff',
  tempest: '#52f4dc',
  aegis: '#f5c47b',
  nova: '#ffab60',
  specter: '#bb9cff'
};

export const getPlayerProjectileColor = (planeId: PlaneId) => playerProjectileColors[planeId];

const imageCache = new Map<string, HTMLImageElement>();

const getImage = (source: string) => {
  let image = imageCache.get(source);
  if (!image && typeof Image !== 'undefined') {
    image = new Image();
    image.src = source;
    imageCache.set(source, image);
  }
  return image?.complete && image.naturalWidth > 0 ? image : null;
};

export const getUnitColor = (type: 'player' | 'enemy', subType?: EnemySubType) => {
  if (type === 'player') return { main: COLORS.PLAYER, flame: COLORS.PLAYER_FLAME, bullet: COLORS.PLAYER_BULLET };
  switch (subType) {
    case 'kamikaze': return { main: COLORS.ENEMY_KAMIKAZE, flame: '#ffb36b', bullet: COLORS.ENEMY_KAMIKAZE };
    case 'elite': return { main: COLORS.ENEMY_ELITE, flame: '#c5b5ff', bullet: COLORS.ENEMY_ELITE };
    case 'super': return { main: COLORS.ENEMY_SUPER, flame: '#ff98aa', bullet: COLORS.ENEMY_SUPER };
    default: return { main: COLORS.ENEMY_GRUNT, flame: '#80f4de', bullet: COLORS.ENEMY_GRUNT };
  }
};

const drawExhaust = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, reverse: boolean, time: number) => {
  const pulse = 0.82 + Math.sin(time / 72 + x) * 0.18;
  const endY = y + (reverse ? -1 : 1) * radius * 2.7 * pulse;
  const flame = ctx.createLinearGradient(x, y, x, endY);
  flame.addColorStop(0, '#fff');
  flame.addColorStop(0.18, color);
  flame.addColorStop(1, 'transparent');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 2.2;
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.46, y);
  ctx.quadraticCurveTo(x, endY, x + radius * 0.46, y);
  ctx.fill();
  ctx.restore();
};

export const drawShip = (
  ctx: CanvasRenderingContext2D,
  type: 'player' | 'enemy',
  subType: EnemySubType | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  playerVariant?: PlaneId,
  time = performance.now()
) => {
  const colors = getUnitColor(type, subType);
  const cx = x + w / 2;
  const isEnemy = type === 'enemy';
  const engineY = isEnemy ? y + h * 0.11 : y + h * 0.8;
  const engineOffset = w * (subType === 'grunt' || subType === 'kamikaze' ? 0 : 0.2);
  drawExhaust(ctx, cx - engineOffset, engineY, w * 0.16, colors.flame, isEnemy, time);
  if (engineOffset) drawExhaust(ctx, cx + engineOffset, engineY, w * 0.16, colors.flame, isEnemy, time + 19);

  const key = isEnemy ? subType ?? 'grunt' : playerVariant ?? 'vanguard';
  const image = getImage(shipAssets[key]);
  if (image) {
    ctx.save();
    ctx.shadowColor = colors.main;
    ctx.shadowBlur = type === 'player' ? 11 : 7;
    ctx.drawImage(image, x, y, w, h);
    ctx.restore();
  } else {
    // 图片尚未解码时，保留可辨认的战机轮廓。
    ctx.fillStyle = colors.main;
    ctx.beginPath();
    ctx.moveTo(cx, isEnemy ? y + h : y);
    ctx.lineTo(x, isEnemy ? y : y + h);
    ctx.lineTo(x + w, isEnemy ? y : y + h);
    ctx.closePath();
    ctx.fill();
  }
};

export const drawProjectile = (ctx: CanvasRenderingContext2D, bullet: Bullet) => {
  const kind: ProjectileVisual = bullet.visual ?? (bullet.owner === 'enemy' ? 'enemy' : 'plasma');
  const image = getImage(projectileAssets[kind]);
  const isMissile = kind === 'missile';
  const width = isMissile ? 19 : kind === 'enemy' ? 13 : bullet.damage >= 1.5 ? 17 : 15;
  const height = isMissile ? 31 : bullet.pierce ? 34 : bullet.damage < 0.7 ? 22 : 26;
  const { x, y } = bullet.pos;
  const tail = bullet.owner === 'enemy' ? -17 : 17;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = bullet.color;
  ctx.globalAlpha = 0.58;
  ctx.lineWidth = isMissile ? 3 : 5;
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - bullet.velocity.x * 2.5, y + tail);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = bullet.color;
  ctx.globalAlpha = 0.25;
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(x, y, width * 0.35, height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (image) {
    ctx.save();
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 8;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};
