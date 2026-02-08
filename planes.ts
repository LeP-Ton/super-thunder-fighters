import { PlaneDef, PlaneId } from './types';

export const ENERGY_MAX = 10;

export const PLANE_DEFS: PlaneDef[] = [
  {
    id: 'vanguard',
    name: 'Vanguard',
    role: 'Balanced frontline fighter',
    trait: 'Stable output and reliable handling.',
    // Baseline: no special mechanics, reliable all‑rounder.
    maxHealth: 120,
    size: 40,
    speed: 6.0,
    fireRate: 210,
    bulletSpeed: 10.5,
    bulletDamage: 1,
    shotSpread: [0],
    damageTakenMult: 1
  },
  {
    id: 'strider',
    name: 'Strider',
    role: 'High-speed interceptor',
    trait: 'Dual shots; kills trigger a short speed boost.',
    // Trait: dual shot spread + on-kill speed boost (see speedBoost*).
    maxHealth: 85,
    size: 36,
    speed: 7.9,
    fireRate: 200,
    bulletSpeed: 12,
    bulletDamage: 0.55,
    shotSpread: [-0.6, 0.6],
    damageTakenMult: 1.2,
    speedBoostMult: 1.35,
    speedBoostDuration: 1.6
  },
  {
    id: 'tempest',
    name: 'Tempest',
    role: 'Rapid-fire skirmisher',
    trait: 'Sustained fire causes overheat.',
    // Trait: heat builds per shot; overheat slows movement and locks firing briefly.
    maxHealth: 100,
    size: 38,
    speed: 6.4,
    fireRate: 135,
    bulletSpeed: 10.5,
    bulletDamage: 0.7,
    shotSpread: [0],
    overheatPerShot: 0.2,
    heatDecayPerSecond: 0.5,
    overheatDuration: 2.0,
    overheatSlowMult: 0.55
  },
  {
    id: 'aegis',
    name: 'Aegis',
    role: 'Heavy armor bulwark',
    trait: 'Takes reduced damage.',
    // Trait: reduced incoming damage via damageTakenMult.
    maxHealth: 190,
    size: 44,
    speed: 4.2,
    fireRate: 300,
    bulletSpeed: 9,
    bulletDamage: 1.5,
    shotSpread: [0],
    damageTakenMult: 0.65
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'High-damage artillery',
    trait: 'Shells splash nearby targets.',
    // Trait: splash damage on hit (splashRadius/splashDamageMult).
    maxHealth: 110,
    size: 42,
    speed: 5.0,
    fireRate: 420,
    bulletSpeed: 9.5,
    bulletDamage: 2.7,
    shotSpread: [0],
    splashRadius: 60,
    splashDamageMult: 0.65
  },
  {
    id: 'specter',
    name: 'Specter',
    role: 'Long-range striker',
    trait: 'Piercing shots, fragile hull.',
    // Trait: bullets pierce multiple targets; higher damage taken.
    maxHealth: 80,
    size: 36,
    speed: 6.9,
    fireRate: 300,
    bulletSpeed: 15,
    bulletDamage: 1.25,
    shotSpread: [0],
    pierceCount: 2,
    damageTakenMult: 1.25
  }
];

export const PLANE_BY_ID = PLANE_DEFS.reduce((acc, plane) => {
  acc[plane.id] = plane;
  return acc;
}, {} as Record<PlaneId, PlaneDef>);

export const DEFAULT_LOADOUT: PlaneId[] = ['vanguard', 'tempest', 'aegis'];
