import { GameObject, GameState, GameStatus, PlaneDef, EnemySubType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_SIZE, ENEMY_BASE_SPEED, ENEMY_FIRE_RATE, PARTICLE_COUNT } from '../constants';
import { ENERGY_MAX, PLANE_BY_ID } from '../planes';
import { getUnitColor } from '../render/ships';
import { getDifficultyMults } from './difficulty';
import { applyKillEffects, getPlaneMoveSpeed, tryFirePlayer, updatePlaneHeat } from './planeBehaviors';

export type Ref<T> = { current: T };

interface UpdateParams {
  time: number;
  status: GameStatus;
  keys: Record<string, boolean>;
  gameStateRef: Ref<GameState>;
  lastTickRef: Ref<number>;
  defaultPlane: PlaneDef;
  draw: () => void;
  setScore: (value: number) => void;
  setLevel: (value: number) => void;
  setEnergy: (value: number) => void;
  setHealth: (value: number) => void;
  setStatus: (value: GameStatus) => void;
}

const createParticles = (state: GameState, x: number, y: number, color: string) => {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    state.particles.push({
      id: Math.random().toString(),
      pos: { x, y },
      velocity: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
      life: 1.0,
      color
    });
  }
};

const spawnEnemy = (state: GameState, level: number, timestamp: number) => {
  const mults = getDifficultyMults(state.difficulty);
  const eliteCount = state.enemies.filter((e) => e.subType === 'elite').length;
  const superCount = state.enemies.filter((e) => e.subType === 'super').length;

  if (state.enemies.length < 4 + level) {
    const rand = Math.random();
    let subType: EnemySubType = 'grunt';
    let size = ENEMY_SIZE;
    let hp = (1 + level) * mults.hp;
    let speedY = (ENEMY_BASE_SPEED + Math.random() * 1) * mults.speed;

    if (level >= 4 && rand < 0.05 && superCount < 1) {
      subType = 'super';
      size = ENEMY_SIZE * 2.0;
      hp = (12 + level) * mults.hp;
    } else if (level >= 3 && rand < 0.15 && eliteCount < 3) {
      subType = 'elite';
      size = ENEMY_SIZE * 1.8;
      hp = (6 + level) * mults.hp;
      speedY = ENEMY_BASE_SPEED * 0.7 * mults.speed;
    } else if (level >= 2 && rand < 0.35) {
      subType = 'kamikaze';
      size = ENEMY_SIZE * 0.9;
      hp = 1;
      speedY = ENEMY_BASE_SPEED * 2.2 * mults.speed;
    }

    const x = Math.random() * (CANVAS_WIDTH - size);
    state.enemies.push({
      id: Math.random().toString(),
      pos: { x, y: -size },
      size: { x: size, y: size },
      velocity: { x: (Math.random() - 0.5) * 2, y: speedY },
      health: hp,
      maxHealth: hp,
      type: 'enemy',
      subType,
      lastShot: timestamp
    });
  }
};

export const updateGame = ({
  time,
  status,
  keys,
  gameStateRef,
  lastTickRef,
  defaultPlane,
  draw,
  setScore,
  setLevel,
  setEnergy,
  setHealth,
  setStatus
}: UpdateParams) => {
  if (status !== GameStatus.PLAYING) return false;
  const state = gameStateRef.current;
  const mults = getDifficultyMults(state.difficulty);
  const { player, enemies, bullets, particles } = state;
  const activePlane = PLANE_BY_ID[state.activePlaneId] || defaultPlane;

  if (player.size.x !== activePlane.size) {
    const cx = player.pos.x + player.size.x / 2;
    const cy = player.pos.y + player.size.y / 2;
    player.size.x = activePlane.size;
    player.size.y = activePlane.size;
    player.pos.x = cx - activePlane.size / 2;
    player.pos.y = cy - activePlane.size / 2;
  }

  const prevTime = lastTickRef.current || time;
  const dt = Math.min(0.05, (time - prevTime) / 1000);
  lastTickRef.current = time;

  const activePlaneState = state.planeStates[state.activePlaneId];
  // Aegis/Specter trait: modifies incoming damage taken.
  const damageTakenMult = activePlane.damageTakenMult ?? 1;
  const isOverheated = updatePlaneHeat(activePlane, activePlaneState, time, dt);
  const moveSpeed = getPlaneMoveSpeed(activePlane, activePlaneState, time, isOverheated);

  if (keys['ArrowLeft'] || keys['a']) player.pos.x -= moveSpeed;
  if (keys['ArrowRight'] || keys['d']) player.pos.x += moveSpeed;
  if (keys['ArrowUp'] || keys['w']) player.pos.y -= moveSpeed;
  if (keys['ArrowDown'] || keys['s']) player.pos.y += moveSpeed;

  player.pos.x = Math.max(0, Math.min(CANVAS_WIDTH - player.size.x, player.pos.x));
  player.pos.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.size.y, player.pos.y));

  if (keys[' '] || keys['Enter']) {
    const pColors = getUnitColor('player');
    const newBullets = tryFirePlayer(activePlane, activePlaneState, player, time, pColors.bullet);
    if (newBullets.length > 0) bullets.push(...newBullets);
  }

  const handleScoreGain = (scoreGain: number) => {
    state.score += scoreGain;
    setScore(state.score);
    const nextLevel = Math.floor(state.score / 2000) + 1;
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      setLevel(nextLevel);
    }
    // Energy gain: 100 score = 1 energy cell.
    const energyGain = Math.floor(scoreGain / 100);
    state.energy = Math.min(ENERGY_MAX, state.energy + energyGain);
    setEnergy(state.energy);
  };

  const handleEnemyKill = (enemy: GameObject) => {
    const eColors = getUnitColor('enemy', enemy.subType);
    createParticles(state, enemy.pos.x + enemy.size.x / 2, enemy.pos.y + enemy.size.y / 2, eColors.main);
    const scoreGain = enemy.subType === 'elite' ? 400 : enemy.subType === 'super' ? 1000 : 100;
    handleScoreGain(scoreGain);
    applyKillEffects(activePlane, activePlaneState, time);
  };

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.pos.y += b.velocity.y;
    b.pos.x += b.velocity.x || 0;
    if (b.pos.y < -50 || b.pos.y > CANVAS_HEIGHT + 50 || b.pos.x < -50 || b.pos.x > CANVAS_WIDTH + 50) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.owner === 'player') {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (b.pos.x > e.pos.x && b.pos.x < e.pos.x + e.size.x && b.pos.y > e.pos.y && b.pos.y < e.pos.y + e.size.y) {
          e.health -= b.damage;
          createParticles(state, b.pos.x, b.pos.y, b.color);

          if (e.health <= 0) {
            handleEnemyKill(e);
            enemies.splice(j, 1);
          }

          // Nova trait: apply splash damage around impact point.
          if (b.splashRadius && b.splashDamageMult) {
            const radiusSq = b.splashRadius * b.splashRadius;
            const splashDamage = b.damage * b.splashDamageMult;
            for (let k = enemies.length - 1; k >= 0; k--) {
              const other = enemies[k];
              const dx = other.pos.x + other.size.x / 2 - b.pos.x;
              const dy = other.pos.y + other.size.y / 2 - b.pos.y;
              if (dx * dx + dy * dy <= radiusSq) {
                other.health -= splashDamage;
                createParticles(state, other.pos.x + other.size.x / 2, other.pos.y + other.size.y / 2, b.color);
                if (other.health <= 0) {
                  handleEnemyKill(other);
                  enemies.splice(k, 1);
                }
              }
            }
          }

          // Specter trait: piercing shots continue through targets.
          if (b.pierce && b.pierce > 0) {
            b.pierce -= 1;
          } else {
            bullets.splice(i, 1);
          }
          break;
        }
      }
    } else {
      if (b.pos.x > player.pos.x && b.pos.x < player.pos.x + player.size.x && b.pos.y > player.pos.y && b.pos.y < player.pos.y + player.size.y) {
        const nextHealth = Math.max(0, player.health - b.damage * damageTakenMult);
        player.health = nextHealth;
        activePlaneState.health = nextHealth;
        setHealth(nextHealth);
        createParticles(state, b.pos.x, b.pos.y, b.color);
        bullets.splice(i, 1);
        if (nextHealth <= 0) setStatus(GameStatus.GAMEOVER);
      }
    }
  }

  spawnEnemy(state, state.level, time);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const eColors = getUnitColor('enemy', e.subType);

    if (e.subType === 'kamikaze') {
      const dx = player.pos.x + player.size.x / 2 - (e.pos.x + e.size.x / 2);
      e.velocity.x = dx * 0.05 * mults.speed;
      e.velocity.y += 0.05 * mults.speed;
    } else if (e.subType === 'super') {
      if (e.pos.y > 100) {
        e.velocity.y = 0;
        if (time - (e.lastShot || 0) > 1800 * mults.fire) {
          for (let ox = -1.5; ox <= 1.5; ox += 1.5) {
            bullets.push({
              id: Math.random().toString(),
              pos: { x: e.pos.x + e.size.x / 2, y: e.pos.y + e.size.y },
              velocity: { x: ox, y: 5 * mults.speed },
              damage: 8,
              owner: 'enemy',
              color: eColors.bullet
            });
          }
          e.lastShot = time;
        }
      }
    } else if (time - (e.lastShot || 0) > (ENEMY_FIRE_RATE / (state.level * 0.1 + 1)) * mults.fire) {
      bullets.push({
        id: Math.random().toString(),
        pos: { x: e.pos.x + e.size.x / 2, y: e.pos.y + e.size.y },
        velocity: { x: 0, y: (3.5 + state.level * 0.4) * mults.speed },
        damage: 5,
        owner: 'enemy',
        color: eColors.bullet
      });
      e.lastShot = time;
    }

    e.pos.x += e.velocity.x;
    e.pos.y += e.velocity.y;
    if (e.pos.x <= 0 || e.pos.x >= CANVAS_WIDTH - e.size.x) e.velocity.x *= -1;
    if (e.pos.y > CANVAS_HEIGHT) {
      enemies.splice(i, 1);
      continue;
    }

    if (e.pos.x < player.pos.x + player.size.x && e.pos.x + e.size.x > player.pos.x && e.pos.y < player.pos.y + player.size.y && e.pos.y + e.size.y > player.pos.y) {
      const nextHealth = Math.max(0, player.health - 25 * damageTakenMult);
      player.health = nextHealth;
      activePlaneState.health = nextHealth;
      setHealth(nextHealth);
      createParticles(state, e.pos.x + e.size.x / 2, e.pos.y + e.size.y / 2, eColors.main);
      enemies.splice(i, 1);
      if (nextHealth <= 0) setStatus(GameStatus.GAMEOVER);
    }
  }

  particles.forEach((p, idx) => {
    p.pos.x += p.velocity.x;
    p.pos.y += p.velocity.y;
    p.life -= 0.025;
    if (p.life <= 0) particles.splice(idx, 1);
  });

  draw();
  return true;
};
