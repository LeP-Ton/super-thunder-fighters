import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';

const stars = Array.from({ length: 105 }, (_, index) => ({
  x: (index * 193.37 + 17) % CANVAS_WIDTH,
  y: (index * 311.91 + 29) % CANVAS_HEIGHT,
  speed: 0.035 + (index % 7) * 0.028,
  length: index % 13 === 0 ? 17 : index % 4 === 0 ? 8 : 3,
  alpha: index % 5 === 0 ? 0.85 : 0.3
}));

export const drawBackground = (ctx: CanvasRenderingContext2D, time: number) => {
  const base = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  base.addColorStop(0, '#09081c');
  base.addColorStop(0.5, '#10072b');
  base.addColorStop(1, '#050914');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const glow = ctx.createRadialGradient(300, 340, 30, 300, 340, 480);
  glow.addColorStop(0, 'rgba(109, 26, 170, .22)');
  glow.addColorStop(0.55, 'rgba(20, 81, 161, .11)');
  glow.addColorStop(1, 'rgba(9, 8, 28, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 透视跑道给纵向卷轴提供速度感，不干扰原有碰撞区域。
  const travel = (time * 0.11) % 100;
  ctx.save();
  ctx.lineWidth = 1;
  for (let y = -100 + travel; y < CANVAS_HEIGHT + 100; y += 100) {
    const perspective = 0.3 + Math.max(0, y) / CANVAS_HEIGHT * 0.8;
    ctx.strokeStyle = `rgba(55, 235, 255, ${0.05 + perspective * 0.07})`;
    ctx.beginPath();
    ctx.moveTo(300 - 255 * perspective, y);
    ctx.lineTo(300 + 255 * perspective, y);
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    for (let lane = 1; lane <= 3; lane++) {
      ctx.strokeStyle = lane === 3 ? 'rgba(255, 58, 191, .17)' : 'rgba(52, 203, 255, .09)';
      ctx.beginPath();
      ctx.moveTo(300 + side * lane * 19, 0);
      ctx.lineTo(300 + side * lane * 82, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const star of stars) {
    const y = (star.y + time * star.speed) % CANVAS_HEIGHT;
    ctx.fillStyle = `rgba(165, 229, 255, ${star.alpha})`;
    ctx.fillRect(star.x, y, star.length > 10 ? 2 : 1, star.length);
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(82, 236, 255, .35)';
  ctx.shadowColor = '#35dcff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(13, 77); ctx.lineTo(13, 13); ctx.lineTo(75, 13);
  ctx.moveTo(CANVAS_WIDTH - 75, 13); ctx.lineTo(CANVAS_WIDTH - 13, 13); ctx.lineTo(CANVAS_WIDTH - 13, 77);
  ctx.moveTo(13, CANVAS_HEIGHT - 77); ctx.lineTo(13, CANVAS_HEIGHT - 13); ctx.lineTo(75, CANVAS_HEIGHT - 13);
  ctx.moveTo(CANVAS_WIDTH - 75, CANVAS_HEIGHT - 13); ctx.lineTo(CANVAS_WIDTH - 13, CANVAS_HEIGHT - 13); ctx.lineTo(CANVAS_WIDTH - 13, CANVAS_HEIGHT - 77);
  ctx.stroke();
  ctx.restore();
};
