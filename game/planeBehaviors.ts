import { Bullet, GameObject, PlaneDef, PlaneState } from '../types';

export const updatePlaneHeat = (plane: PlaneDef, planeState: PlaneState, time: number, dt: number) => {
  const isOverheated = planeState.overheatUntil > time;
  if (plane.overheatPerShot) {
    if (!isOverheated) {
      const decay = plane.heatDecayPerSecond ?? 0;
      if (decay > 0 && planeState.heat > 0) {
        planeState.heat = Math.max(0, planeState.heat - decay * dt);
      }
    }
  } else {
    planeState.heat = 0;
    planeState.overheatUntil = 0;
  }
  // Returns true when overheat is active (Tempest trait).
  return planeState.overheatUntil > time;
};

export const getPlaneMoveSpeed = (plane: PlaneDef, planeState: PlaneState, time: number, isOverheated: boolean) => {
  let moveSpeed = plane.speed;
  if (planeState.speedBoostUntil > time && plane.speedBoostMult) {
    // Strider trait: short speed burst after kills.
    moveSpeed *= plane.speedBoostMult;
  }
  if (isOverheated && plane.overheatSlowMult) {
    // Tempest trait: overheat slows movement.
    moveSpeed *= plane.overheatSlowMult;
  }
  return moveSpeed;
};

export const tryFirePlayer = (
  plane: PlaneDef,
  planeState: PlaneState,
  player: GameObject,
  time: number,
  bulletColor: string
): Bullet[] => {
  const isOverheated = planeState.overheatUntil > time;
  if (isOverheated) return [];
  if (time - (planeState.lastShot || 0) <= plane.fireRate) return [];

  // shotSpread defines multi-shot patterns (Strider dual shots).
  const spreads = plane.shotSpread?.length ? plane.shotSpread : [0];
  const bullets = spreads.map((spread) => ({
    id: Math.random().toString(),
    pos: { x: player.pos.x + player.size.x / 2 + spread * 4, y: player.pos.y },
    velocity: { x: spread, y: -plane.bulletSpeed },
    damage: plane.bulletDamage,
    owner: 'player' as const,
    color: bulletColor,
    pierce: plane.pierceCount ?? 0,
    splashRadius: plane.splashRadius,
    splashDamageMult: plane.splashDamageMult
  }));

  planeState.lastShot = time;
  player.lastShot = time;

  if (plane.overheatPerShot) {
    // Tempest trait: heat buildup on every shot, triggers overheat lockout.
    planeState.heat = Math.min(1.2, planeState.heat + plane.overheatPerShot);
    if (planeState.heat >= 1) {
      planeState.overheatUntil = time + (plane.overheatDuration ?? 1) * 1000;
      planeState.heat = 1;
    }
  }

  return bullets;
};

export const applyKillEffects = (plane: PlaneDef, planeState: PlaneState, time: number) => {
  if (plane.speedBoostMult && plane.speedBoostDuration) {
    // Strider trait: reward kills with a brief speed boost.
    planeState.speedBoostUntil = time + plane.speedBoostDuration * 1000;
  }
};
