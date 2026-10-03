import { COLORS } from "../constants";
import { Bullet, EnemySubType, PlaneId } from "../types";

export const shipAssets: Record<PlaneId | EnemySubType, string> = {
  vanguard: "/assets/ships/vanguard.png",
  strider: "/assets/ships/strider.png",
  tempest: "/assets/ships/tempest.png",
  aegis: "/assets/ships/aegis.png",
  nova: "/assets/ships/nova.png",
  specter: "/assets/ships/specter.png",
  grunt: "/assets/ships/grunt.png",
  kamikaze: "/assets/ships/kamikaze.png",
  elite: "/assets/ships/elite.png",
  super: "/assets/ships/super.png",
};

export type ProjectileVisual = "plasma" | "missile" | "enemy";

const playerProjectileColors: Record<PlaneId, string> = {
  vanguard: "#95d5f4",
  strider: "#d4e8f0",
  tempest: "#b6d8ca",
  aegis: "#e2c99b",
  nova: "#e6a06a",
  specter: "#b6afcb",
};

export const getPlayerProjectileColor = (planeId: PlaneId) =>
  playerProjectileColors[planeId];

const imageCache = new Map<string, HTMLImageElement>();

const getImage = (source: string) => {
  let image = imageCache.get(source);
  if (!image && typeof Image !== "undefined") {
    image = new Image();
    image.src = source;
    imageCache.set(source, image);
  }
  return image?.complete && image.naturalWidth > 0 ? image : null;
};

export const getUnitColor = (
  type: "player" | "enemy",
  subType?: EnemySubType,
) => {
  if (type === "player")
    return {
      main: COLORS.PLAYER,
      flame: COLORS.PLAYER_FLAME,
      bullet: COLORS.PLAYER_BULLET,
    };
  switch (subType) {
    case "kamikaze":
      return {
        main: COLORS.ENEMY_KAMIKAZE,
        flame: "#e9a15c",
        bullet: COLORS.ENEMY_KAMIKAZE,
      };
    case "elite":
      return {
        main: COLORS.ENEMY_ELITE,
        flame: "#d98a5e",
        bullet: COLORS.ENEMY_ELITE,
      };
    case "super":
      return {
        main: COLORS.ENEMY_SUPER,
        flame: "#e4a35d",
        bullet: COLORS.ENEMY_SUPER,
      };
    default:
      return {
        main: COLORS.ENEMY_GRUNT,
        flame: "#d39060",
        bullet: COLORS.ENEMY_GRUNT,
      };
  }
};

const drawExhaust = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  reverse: boolean,
  time: number,
) => {
  const pulse = 0.86 + Math.sin(time / 82 + x) * 0.14;
  const endY = y + (reverse ? -1 : 1) * radius * 2.7 * pulse;
  const flame = ctx.createLinearGradient(x, y, x, endY);
  flame.addColorStop(0, "#f9f3e5");
  flame.addColorStop(0.16, color);
  flame.addColorStop(0.52, color);
  flame.addColorStop(1, "transparent");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 1.5;
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.46, y);
  ctx.quadraticCurveTo(x, endY, x + radius * 0.46, y);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.48;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.2, y);
  ctx.lineTo(x, endY * 0.58 + y * 0.42);
  ctx.lineTo(x + radius * 0.2, y);
  ctx.fill();
  ctx.restore();
};

export const drawShip = (
  ctx: CanvasRenderingContext2D,
  type: "player" | "enemy",
  subType: EnemySubType | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  playerVariant?: PlaneId,
  time = performance.now(),
) => {
  const colors = getUnitColor(type, subType);
  const cx = x + w / 2;
  const isEnemy = type === "enemy";
  const engineY = isEnemy ? y + h * 0.11 : y + h * 0.8;
  const engineOffset =
    w * (subType === "grunt" || subType === "kamikaze" ? 0 : 0.2);
  const exhaustColor = isEnemy ? colors.flame : "#efb075";
  drawExhaust(
    ctx,
    cx - engineOffset,
    engineY,
    w * 0.13,
    exhaustColor,
    isEnemy,
    time,
  );
  if (engineOffset)
    drawExhaust(
      ctx,
      cx + engineOffset,
      engineY,
      w * 0.13,
      exhaustColor,
      isEnemy,
      time + 19,
    );

  const key = isEnemy ? (subType ?? "grunt") : (playerVariant ?? "vanguard");
  const image = getImage(shipAssets[key]);
  if (image) {
    ctx.save();
    ctx.shadowColor = isEnemy ? "#9b503a" : "#6c9fba";
    ctx.shadowBlur = 6;
    const visualScale = 1.72;
    const visualWidth = w * visualScale;
    const visualHeight = h * visualScale;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = visualWidth / visualHeight;
    const drawWidth =
      imageRatio < boxRatio ? visualHeight * imageRatio : visualWidth;
    const drawHeight =
      imageRatio < boxRatio ? visualHeight : visualWidth / imageRatio;
    ctx.translate(cx, y + h / 2);
    if (isEnemy) ctx.rotate(Math.PI);
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
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

export const drawProjectile = (
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
) => {
  const missile = bullet.visual === "missile";
  const angle = Math.atan2(bullet.velocity.x, -bullet.velocity.y);
  ctx.save();
  ctx.translate(bullet.pos.x, bullet.pos.y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "screen";
  const trail = ctx.createLinearGradient(0, -6, 0, 21);
  trail.addColorStop(0, "#fff7e5");
  trail.addColorStop(0.22, bullet.color);
  trail.addColorStop(1, "transparent");
  ctx.fillStyle = trail;
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = missile ? 9 : 7;
  ctx.beginPath();
  ctx.ellipse(0, 5, missile ? 2.6 : 2, missile ? 18 : 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff9ec";
  ctx.fillRect(-0.8, -6, 1.6, 8);
  ctx.restore();
};
