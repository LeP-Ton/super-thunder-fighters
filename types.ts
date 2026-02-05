
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
}

export type Difficulty = 'easy' | 'normal' | 'hard';

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
}

export interface Particle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  life: number;
  color: string;
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
}
