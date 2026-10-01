import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';

const stars = Array.from({ length: 86 }, (_, index) => ({
  x: (index * 173.71) % CANVAS_WIDTH,
  y: (index * 311.39) % CANVAS_HEIGHT,
  size: index % 9 === 0 ? 1.8 : index % 3 === 0 ? 1.15 : 0.7,
  speed: index % 5 === 0 ? 0.12 : 0.055,
  alpha: index % 7 === 0 ? 0.9 : 0.38
}));

export const drawBackground = (ctx: CanvasRenderingContext2D, time: number) => {
  const base = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  base.addColorStop(0, '#020b16');
  base.addColorStop(0.55, '#081626');
  base.addColorStop(1, '#020710');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const nebula = ctx.createRadialGradient(465, 180, 10, 465, 180, 390);
  nebula.addColorStop(0, 'rgba(21, 94, 121, .26)');
  nebula.addColorStop(1, 'rgba(21, 94, 121, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.strokeStyle = 'rgba(92, 161, 181, .08)';
  ctx.lineWidth = 1;
  const travel = (time * 0.025) % 80;
  for (let y = travel; y < CANVAS_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  for (let x = 0; x <= CANVAS_WIDTH; x += 75) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  for (const star of stars) {
    const y = (star.y + time * star.speed) % CANVAS_HEIGHT;
    ctx.fillStyle = `rgba(201, 232, 244, ${star.alpha})`;
    ctx.fillRect(star.x, y, star.size, star.size * 2);
  }

  ctx.strokeStyle = 'rgba(61, 191, 224, .22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(11, 11, CANVAS_WIDTH - 22, CANVAS_HEIGHT - 22);
  ctx.fillStyle = 'rgba(61, 191, 224, .3)';
  for (const [x, y, dx, dy] of [
    [11, 11, 1, 1], [CANVAS_WIDTH - 11, 11, -1, 1],
    [11, CANVAS_HEIGHT - 11, 1, -1], [CANVAS_WIDTH - 11, CANVAS_HEIGHT - 11, -1, -1]
  ]) {
    ctx.fillRect(x, y, 22 * dx, 3 * dy);
    ctx.fillRect(x, y, 3 * dx, 22 * dy);
  }
};
