import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants";

const scene = typeof Image === "undefined" ? null : new Image();
if (scene) scene.src = "/assets/environments/ocean-theater.png";

const dust = Array.from({ length: 42 }, (_, index) => ({
  x: (index * 193.37 + 17) % CANVAS_WIDTH,
  y: (index * 311.91 + 29) % CANVAS_HEIGHT,
  speed: 0.009 + (index % 5) * 0.008,
  radius: index % 7 === 0 ? 1.2 : 0.55,
  alpha: index % 8 === 0 ? 0.62 : 0.23,
}));

export const drawBackground = (ctx: CanvasRenderingContext2D, time: number) => {
  ctx.fillStyle = "#050c16";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (scene?.complete && scene.naturalWidth) {
    // 场景略放大后作慢速漂移，避免平铺接缝，也让战场保持真实的空间尺度。
    const driftX = Math.sin(time * 0.000045) * 11;
    const driftY = Math.cos(time * 0.000036) * 12;
    ctx.drawImage(
      scene,
      -35 + driftX,
      -48 + driftY,
      CANVAS_WIDTH + 70,
      CANVAS_HEIGHT + 96,
    );
  }

  const corridor = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  corridor.addColorStop(0, "rgba(1, 7, 14, .04)");
  corridor.addColorStop(0.28, "rgba(1, 7, 14, .16)");
  corridor.addColorStop(0.72, "rgba(1, 7, 14, .16)");
  corridor.addColorStop(1, "rgba(1, 7, 14, .04)");
  ctx.fillStyle = corridor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const particle of dust) {
    const y = (particle.y + time * particle.speed) % CANVAS_HEIGHT;
    ctx.fillStyle = `rgba(196, 220, 236, ${particle.alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.strokeStyle = "rgba(152, 202, 222, .28)";
  ctx.lineWidth = 1;
  for (const [x, y, sx, sy] of [
    [16, 16, 1, 1],
    [CANVAS_WIDTH - 16, 16, -1, 1],
    [16, CANVAS_HEIGHT - 16, 1, -1],
    [CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * 38, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * 38);
    ctx.stroke();
  }
  ctx.restore();
};
