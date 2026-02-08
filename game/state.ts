import { Difficulty, PlaneId, PlaneState } from '../types';
import { PLANE_DEFS } from '../planes';
import { getDifficultyMults } from './difficulty';

export const buildPlaneStates = (diff: Difficulty): Record<PlaneId, PlaneState> => {
  const mults = getDifficultyMults(diff);
  const hpScale = mults.playerHp / 100;
  const states = {} as Record<PlaneId, PlaneState>;
  PLANE_DEFS.forEach((plane) => {
    const maxHealth = Math.round(plane.maxHealth * hpScale);
    states[plane.id] = { health: maxHealth, maxHealth, lastShot: 0, heat: 0, overheatUntil: 0, speedBoostUntil: 0 };
  });
  return states;
};
