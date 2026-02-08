
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export type PlaneId = 'vanguard' | 'strider' | 'tempest' | 'aegis' | 'nova' | 'specter';

export interface Vector2 {
  x: number;
  y: number;
}

export type EnemySubType = 'grunt' | 'kamikaze' | 'elite' | 'super';

export interface GameObject {
  id: string;
  pos: Vector2;
  size: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  type: 'player' | 'enemy' | 'boss' | 'powerup';
  subType?: EnemySubType;
  lastShot?: number;
}

export interface Bullet {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  damage: number;
  owner: 'player' | 'enemy';
  color: string; // 新增：子弹颜色
  pierce?: number;
  splashRadius?: number;
  splashDamageMult?: number;
}

export interface Particle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  life: number;
  color: string;
}

export interface PlaneState {
  health: number;
  maxHealth: number;
  lastShot: number;
  heat: number;
  overheatUntil: number;
  speedBoostUntil: number;
}

export interface PlaneDef {
  id: PlaneId;
  name: string;
  role: string;
  trait: string;
  maxHealth: number;
  size: number;
  speed: number;
  fireRate: number;
  bulletSpeed: number;
  bulletDamage: number;
  shotSpread?: number[];
  damageTakenMult?: number;
  splashRadius?: number;
  splashDamageMult?: number;
  pierceCount?: number;
  overheatPerShot?: number;
  heatDecayPerSecond?: number;
  overheatDuration?: number;
  overheatSlowMult?: number;
  speedBoostMult?: number;
  speedBoostDuration?: number;
}

export interface GameState {
  player: GameObject;
  enemies: GameObject[];
  bullets: Bullet[];
  particles: Particle[];
  score: number;
  level: number;
  status: GameStatus;
  difficulty: Difficulty;
  activePlaneId: PlaneId;
  planeStates: Record<PlaneId, PlaneState>;
  energy: number;
}
