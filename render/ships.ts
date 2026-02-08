import { COLORS } from '../constants';
import { EnemySubType, PlaneId } from '../types';

export const getUnitColor = (type: 'player' | 'enemy', subType?: EnemySubType) => {
  if (type === 'player') return { main: COLORS.PLAYER, flame: COLORS.PLAYER_FLAME, bullet: COLORS.PLAYER_BULLET };
  switch (subType) {
    case 'kamikaze': return { main: COLORS.ENEMY_KAMIKAZE, flame: '#fdba74', bullet: COLORS.ENEMY_KAMIKAZE };
    case 'elite': return { main: COLORS.ENEMY_ELITE, flame: '#ddd6fe', bullet: COLORS.ENEMY_ELITE };
    case 'super': return { main: COLORS.ENEMY_SUPER, flame: '#fda4af', bullet: COLORS.ENEMY_SUPER };
    default: return { main: COLORS.ENEMY_GRUNT, flame: '#5eead4', bullet: COLORS.ENEMY_GRUNT };
  }
};

const drawExhaust = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, length: number, color: string, isDown: boolean = false) => {
  const flicker = Math.sin(Date.now() / 40) * 6;
  const gradient = ctx.createLinearGradient(x, y, x, isDown ? y - (length + flicker) : y + (length + flicker));
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x, isDown ? y - (length + flicker) : y + (length + flicker));
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();
};

export const drawShip = (
  ctx: CanvasRenderingContext2D,
  type: 'player' | 'enemy',
  subType: EnemySubType | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  playerVariant?: PlaneId
) => {
  const cx = x + w / 2;
  const colors = getUnitColor(type, subType);
  const poly = (points: Array<[number, number]>, color: string, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  if (type === 'player') {
    const variant = playerVariant ?? 'vanguard';
    const accent = '#0ea5e9';
    const highlight = '#7dd3fc';
    const shadow = '#0369a1';

    switch (variant) {
      case 'vanguard': {
        drawExhaust(ctx, cx - w * 0.18, y + h, w * 0.15, 25, colors.flame);
        drawExhaust(ctx, cx + w * 0.18, y + h, w * 0.15, 25, colors.flame);
        poly([[cx, y], [x, y + h], [x + w, y + h]], colors.main);
        poly([[x + w * 0.12, y + h * 0.95], [x + w * 0.25, y + h * 0.6], [x + w * 0.4, y + h * 0.95]], shadow, 0.9);
        poly([[x + w * 0.88, y + h * 0.95], [x + w * 0.75, y + h * 0.6], [x + w * 0.6, y + h * 0.95]], shadow, 0.9);
        poly([[cx, y + h * 0.2], [x + w * 0.42, y + h * 0.55], [cx, y + h * 0.7], [x + w * 0.58, y + h * 0.55]], highlight, 0.65);
        break;
      }
      case 'strider': {
        drawExhaust(ctx, cx - w * 0.22, y + h, w * 0.12, 22, colors.flame);
        drawExhaust(ctx, cx, y + h, w * 0.1, 26, colors.flame);
        drawExhaust(ctx, cx + w * 0.22, y + h, w * 0.12, 22, colors.flame);
        poly([[cx, y], [x + w * 0.22, y + h * 0.7], [x + w * 0.35, y + h], [x + w * 0.65, y + h], [x + w * 0.78, y + h * 0.7]], colors.main);
        poly([[x + w * 0.18, y + h * 0.45], [x + w * 0.04, y + h * 0.8], [x + w * 0.28, y + h * 0.82]], shadow, 0.85);
        poly([[x + w * 0.82, y + h * 0.45], [x + w * 0.96, y + h * 0.8], [x + w * 0.72, y + h * 0.82]], shadow, 0.85);
        poly([[cx, y + h * 0.25], [x + w * 0.46, y + h * 0.55], [cx, y + h * 0.82], [x + w * 0.54, y + h * 0.55]], highlight, 0.6);
        break;
      }
      case 'tempest': {
        drawExhaust(ctx, cx - w * 0.2, y + h, w * 0.14, 24, colors.flame);
        drawExhaust(ctx, cx + w * 0.2, y + h, w * 0.14, 24, colors.flame);
        poly([[cx, y], [x + w * 0.12, y + h * 0.55], [x + w * 0.28, y + h], [cx, y + h * 0.82], [x + w * 0.72, y + h], [x + w * 0.88, y + h * 0.55]], colors.main);
        poly([[x + w * 0.05, y + h * 0.6], [x + w * 0.18, y + h * 0.78], [x + w * 0.1, y + h * 0.95]], accent, 0.75);
        poly([[x + w * 0.95, y + h * 0.6], [x + w * 0.82, y + h * 0.78], [x + w * 0.9, y + h * 0.95]], accent, 0.75);
        poly([[cx, y + h * 0.18], [x + w * 0.4, y + h * 0.5], [cx, y + h * 0.68], [x + w * 0.6, y + h * 0.5]], highlight, 0.65);
        break;
      }
      case 'aegis': {
        drawExhaust(ctx, cx - w * 0.22, y + h, w * 0.18, 20, colors.flame);
        drawExhaust(ctx, cx + w * 0.22, y + h, w * 0.18, 20, colors.flame);
        poly([[cx, y], [x + w * 0.1, y + h * 0.35], [x + w * 0.1, y + h * 0.85], [cx, y + h], [x + w * 0.9, y + h * 0.85], [x + w * 0.9, y + h * 0.35]], colors.main);
        poly([[x + w * 0.1, y + h * 0.35], [x + w * 0.02, y + h * 0.55], [x + w * 0.1, y + h * 0.85]], shadow, 0.85);
        poly([[x + w * 0.9, y + h * 0.35], [x + w * 0.98, y + h * 0.55], [x + w * 0.9, y + h * 0.85]], shadow, 0.85);
        poly([[cx, y + h * 0.2], [x + w * 0.32, y + h * 0.55], [cx, y + h * 0.85], [x + w * 0.68, y + h * 0.55]], highlight, 0.55);
        break;
      }
      case 'nova': {
        drawExhaust(ctx, cx - w * 0.16, y + h, w * 0.14, 22, colors.flame);
        drawExhaust(ctx, cx + w * 0.16, y + h, w * 0.14, 22, colors.flame);
        poly([[cx, y], [x + w * 0.2, y + h * 0.45], [x + w * 0.35, y + h], [x + w * 0.65, y + h], [x + w * 0.8, y + h * 0.45]], colors.main);
        poly([[x + w * 0.08, y + h * 0.6], [x + w * 0.22, y + h * 0.72], [x + w * 0.14, y + h * 0.92], [x + w * 0.02, y + h * 0.78]], accent, 0.8);
        poly([[x + w * 0.92, y + h * 0.6], [x + w * 0.78, y + h * 0.72], [x + w * 0.86, y + h * 0.92], [x + w * 0.98, y + h * 0.78]], accent, 0.8);
        poly([[cx, y + h * 0.22], [x + w * 0.43, y + h * 0.52], [cx, y + h * 0.8], [x + w * 0.57, y + h * 0.52]], highlight, 0.6);
        break;
      }
      case 'specter': {
        drawExhaust(ctx, cx - w * 0.1, y + h, w * 0.08, 24, colors.flame);
        drawExhaust(ctx, cx + w * 0.1, y + h, w * 0.08, 24, colors.flame);
        poly([[cx, y], [x + w * 0.42, y + h * 0.75], [x + w * 0.46, y + h], [x + w * 0.54, y + h], [x + w * 0.58, y + h * 0.75]], colors.main);
        poly([[x + w * 0.18, y + h * 0.62], [x + w * 0.38, y + h * 0.7], [x + w * 0.32, y + h * 0.9]], shadow, 0.8);
        poly([[x + w * 0.82, y + h * 0.62], [x + w * 0.62, y + h * 0.7], [x + w * 0.68, y + h * 0.9]], shadow, 0.8);
        poly([[cx, y + h * 0.18], [x + w * 0.47, y + h * 0.5], [cx, y + h * 0.78], [x + w * 0.53, y + h * 0.5]], highlight, 0.55);
        break;
      }
      default: {
        drawExhaust(ctx, cx - w * 0.18, y + h, w * 0.15, 25, colors.flame);
        drawExhaust(ctx, cx + w * 0.18, y + h, w * 0.15, 25, colors.flame);
        poly([[cx, y], [x, y + h], [x + w, y + h]], colors.main);
      }
    }
  } else {
    ctx.fillStyle = colors.main;

    if (subType === 'grunt') {
      drawExhaust(ctx, cx, y, w * 0.35, 20, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
    } else if (subType === 'kamikaze') {
      drawExhaust(ctx, cx, y, w * 0.25, 22, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(x + w * 0.35, y);
      ctx.lineTo(x + w * 0.65, y);
      ctx.closePath();
      ctx.fill();
    } else if (subType === 'elite') {
      drawExhaust(ctx, cx - w * 0.2, y, w * 0.15, 18, colors.flame, true);
      drawExhaust(ctx, cx + w * 0.2, y, w * 0.15, 18, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(x, y + h * 0.3);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (subType === 'super') {
      drawExhaust(ctx, cx - w * 0.25, y, w * 0.18, 20, colors.flame, true);
      drawExhaust(ctx, cx + w * 0.25, y, w * 0.18, 20, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
    }
  }
};
