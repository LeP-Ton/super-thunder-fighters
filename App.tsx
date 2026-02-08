
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, GameState, GameObject, Bullet, Particle, EnemySubType, Difficulty } from './types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, PLAYER_SPEED, 
  PLAYER_FIRE_RATE, PLAYER_BULLET_SPEED, ENEMY_SIZE, 
  ENEMY_BASE_SPEED, ENEMY_FIRE_RATE, BULLET_RADIUS, 
  COLORS, PARTICLE_COUNT 
} from './constants';
import { Shield, Target, Trophy, Play, RotateCcw, Zap, Terminal, Info, X, Activity, Flame, Settings, Languages, Crosshair, ChevronUp, Gauge, RefreshCw, AlertTriangle } from 'lucide-react';
import { getPilotBriefing, Briefing } from './services/geminiService';
import { translations, Language } from './i18n';

// --- Visual Helpers ---

const getUnitColor = (type: 'player' | 'enemy', subType?: EnemySubType) => {
  if (type === 'player') return { main: COLORS.PLAYER, flame: COLORS.PLAYER_FLAME, bullet: COLORS.PLAYER_BULLET };
  switch (subType) {
    case 'kamikaze': return { main: COLORS.ENEMY_KAMIKAZE, flame: '#fdba74', bullet: COLORS.ENEMY_KAMIKAZE };
    case 'elite': return { main: COLORS.ENEMY_ELITE, flame: '#ddd6fe', bullet: COLORS.ENEMY_ELITE };
    case 'super': return { main: COLORS.ENEMY_SUPER, flame: '#fda4af', bullet: COLORS.ENEMY_SUPER };
    default: return { main: COLORS.ENEMY_GRUNT, flame: '#5eead4', bullet: COLORS.ENEMY_GRUNT };
  }
};

const drawExhaust = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, length: number, color: string, isDown: boolean = false) => {
  const flicker = Math.sin(Date.now() / 40) * 6;
  const gradient = ctx.createLinearGradient(x, y, x, isDown ? y - (length + flicker) : y + (length + flicker));
  
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x, isDown ? y - (length + flicker) : y + (length + flicker));
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();
};

const drawShip = (ctx: CanvasRenderingContext2D, type: 'player' | 'enemy', subType: EnemySubType | undefined, x: number, y: number, w: number, h: number) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const colors = getUnitColor(type, subType);

  if (type === 'player') {
    // Player: Dual Flames constrained inside bottom width
    drawExhaust(ctx, cx - w * 0.18, y + h, w * 0.15, 25, colors.flame);
    drawExhaust(ctx, cx + w * 0.18, y + h, w * 0.15, 25, colors.flame);

    // Player Body (Pointy Triangle)
    ctx.fillStyle = colors.main;
    ctx.beginPath();
    ctx.moveTo(cx, y); // Sharp nose
    ctx.lineTo(x, y + h); // Bottom Left
    ctx.lineTo(x + w, y + h); // Bottom Right
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.2, y + h * 0.6);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w * 0.8, y + h * 0.6);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.closePath();
    ctx.fill();
  } else {
    // Enemy (Flame points UP)
    ctx.fillStyle = colors.main;

    if (subType === 'grunt') {
      drawExhaust(ctx, cx, y, w * 0.35, 20, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h); // Nose down
      ctx.lineTo(x, y); 
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
    } 
    else if (subType === 'kamikaze') {
      drawExhaust(ctx, cx, y, w * 0.25, 22, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h);
      ctx.lineTo(x + w * 0.35, y);
      ctx.lineTo(x + w * 0.65, y);
      ctx.closePath();
      ctx.fill();
    }
    else if (subType === 'elite') {
      // Short and Wide Pentagonal Shield
      drawExhaust(ctx, cx - w * 0.2, y, w * 0.15, 18, colors.flame, true);
      drawExhaust(ctx, cx + w * 0.2, y, w * 0.15, 18, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h); // Nose
      ctx.lineTo(x, y + h * 0.3); // Mid left
      ctx.lineTo(x, y); // Top left
      ctx.lineTo(x + w, y); // Top right
      ctx.lineTo(x + w, y + h * 0.3); // Mid right
      ctx.closePath();
      ctx.fill();
    }
    else if (subType === 'super') {
      // Pure Delta Wing (No core details)
      drawExhaust(ctx, cx - w * 0.25, y, w * 0.18, 20, colors.flame, true);
      drawExhaust(ctx, cx + w * 0.25, y, w * 0.18, 20, colors.flame, true);
      ctx.beginPath();
      ctx.moveTo(cx, y + h); // Nose
      ctx.lineTo(x, y); // Left wing
      ctx.lineTo(x + w, y); // Right wing
      ctx.closePath();
      ctx.fill();
    }
  }
};

// --- Main App Component ---

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [showIntel, setShowIntel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const t = translations[language];

  const gameStateRef = useRef<GameState>({
    player: { id: 'p', pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 }, size: { x: PLAYER_SIZE, y: PLAYER_SIZE }, velocity: { x: 0, y: 0 }, health: 100, maxHealth: 100, type: 'player' },
    enemies: [], bullets: [], particles: [], score: 0, level: 1, status: GameStatus.START, difficulty: 'normal'
  });

  const requestRef = useRef<number>();

  const getDifficultyMults = useCallback((diff: Difficulty) => {
    switch (diff) {
      case 'easy': return { hp: 0.7, fire: 1.5, speed: 0.8, playerHp: 150 };
      case 'hard': return { hp: 1.3, fire: 0.8, speed: 1.2, playerHp: 80 };
      default: return { hp: 1.0, fire: 1.0, speed: 1.0, playerHp: 100 };
    }
  }, []);

  const returnToHome = () => {
    const mults = getDifficultyMults(difficulty);
    setScore(0);
    setLevel(1);
    setHealth(mults.playerHp);
    setMaxHealth(mults.playerHp);
    setShowIntel(false);
    setShowSettings(false);
    gameStateRef.current = {
      player: {
        id: 'player', pos: { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 100 }, size: { x: PLAYER_SIZE, y: PLAYER_SIZE },
        velocity: { x: 0, y: 0 }, health: mults.playerHp, maxHealth: mults.playerHp, type: 'player', lastShot: 0
      },
      enemies: [], bullets: [], particles: [], score: 0, level: 1, status: GameStatus.START, difficulty: difficulty
    };
    setStatus(GameStatus.START);
  };

  const initGame = () => {
    const mults = getDifficultyMults(difficulty);
    setScore(0); setLevel(1); setHealth(mults.playerHp); setMaxHealth(mults.playerHp);
    setShowIntel(false); setShowSettings(false);
    gameStateRef.current = {
      player: {
        id: 'player', pos: { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 100 }, size: { x: PLAYER_SIZE, y: PLAYER_SIZE },
        velocity: { x: 0, y: 0 }, health: mults.playerHp, maxHealth: mults.playerHp, type: 'player', lastShot: 0
      },
      enemies: [], bullets: [], particles: [], score: 0, level: 1, status: GameStatus.PLAYING, difficulty: difficulty
    };
    setStatus(GameStatus.PLAYING);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      gameStateRef.current.particles.push({
        id: Math.random().toString(), pos: { x, y }, velocity: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }, life: 1.0, color
      });
    }
  };

  const spawnEnemy = (timestamp: number) => {
    const state = gameStateRef.current;
    const mults = getDifficultyMults(state.difficulty);
    const eliteCount = state.enemies.filter(e => e.subType === 'elite').length;
    const superCount = state.enemies.filter(e => e.subType === 'super').length;
    
    if (state.enemies.length < 4 + level) {
      const rand = Math.random();
      let subType: EnemySubType = 'grunt';
      let size = ENEMY_SIZE;
      let hp = (1 + level) * mults.hp;
      let speedY = (ENEMY_BASE_SPEED + Math.random() * 1) * mults.speed;

      if (level >= 4 && rand < 0.05 && superCount < 1) {
        subType = 'super'; size = ENEMY_SIZE * 2.0; hp = (12 + level) * mults.hp;
      } else if (level >= 3 && rand < 0.15 && eliteCount < 3) {
        subType = 'elite'; size = ENEMY_SIZE * 1.8; hp = (6 + level) * mults.hp; speedY = ENEMY_BASE_SPEED * 0.7 * mults.speed;
      } else if (level >= 2 && rand < 0.35) {
        subType = 'kamikaze'; size = ENEMY_SIZE * 0.9; hp = 1; speedY = ENEMY_BASE_SPEED * 2.2 * mults.speed;
      }

      const x = Math.random() * (CANVAS_WIDTH - size);
      state.enemies.push({
        id: Math.random().toString(), pos: { x, y: -size }, size: { x: size, y: size }, velocity: { x: (Math.random() - 0.5) * 2, y: speedY },
        health: hp, maxHealth: hp, type: 'enemy', subType, lastShot: timestamp
      });
    }
  };

  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;
    const state = gameStateRef.current;
    const mults = getDifficultyMults(state.difficulty);
    const { player, enemies, bullets, particles } = state;

    if (keys['ArrowLeft'] || keys['a']) player.pos.x -= PLAYER_SPEED;
    if (keys['ArrowRight'] || keys['d']) player.pos.x += PLAYER_SPEED;
    if (keys['ArrowUp'] || keys['w']) player.pos.y -= PLAYER_SPEED;
    if (keys['ArrowDown'] || keys['s']) player.pos.y += PLAYER_SPEED;

    player.pos.x = Math.max(0, Math.min(CANVAS_WIDTH - player.size.x, player.pos.x));
    player.pos.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.size.y, player.pos.y));

    if (keys[' '] || keys['Enter']) {
      if (time - (player.lastShot || 0) > PLAYER_FIRE_RATE) {
        const pColors = getUnitColor('player');
        bullets.push({
          id: Math.random().toString(), pos: { x: player.pos.x + player.size.x / 2, y: player.pos.y }, velocity: { x: 0, y: -PLAYER_BULLET_SPEED },
          damage: 1, owner: 'player', color: pColors.bullet
        });
        player.lastShot = time;
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; b.pos.y += b.velocity.y; b.pos.x += b.velocity.x || 0;
      if (b.pos.y < -50 || b.pos.y > CANVAS_HEIGHT + 50) { bullets.splice(i, 1); continue; }
      
      if (b.owner === 'player') {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (b.pos.x > e.pos.x && b.pos.x < e.pos.x + e.size.x && b.pos.y > e.pos.y && b.pos.y < e.pos.y + e.size.y) {
            e.health -= b.damage; createParticles(b.pos.x, b.pos.y, b.color); bullets.splice(i, 1);
            if (e.health <= 0) {
              const eColors = getUnitColor('enemy', e.subType);
              createParticles(e.pos.x + e.size.x/2, e.pos.y + e.size.y/2, eColors.main);
              enemies.splice(j, 1);
              state.score += (e.subType === 'elite' ? 400 : e.subType === 'super' ? 1000 : 100);
              setScore(state.score); if (state.score % 2000 === 0) { setLevel(prev => prev + 1); state.level++; }
            }
            break;
          }
        }
      } else {
        if (b.pos.x > player.pos.x && b.pos.x < player.pos.x + player.size.x && b.pos.y > player.pos.y && b.pos.y < player.pos.y + player.size.y) {
          const nextHealth = Math.max(0, player.health - 5);
          player.health = nextHealth;
          setHealth(nextHealth);
          createParticles(b.pos.x, b.pos.y, b.color);
          bullets.splice(i, 1);
          if (nextHealth <= 0) setStatus(GameStatus.GAMEOVER);
        }
      }
    }

    spawnEnemy(time);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; const eColors = getUnitColor('enemy', e.subType);
      
      if (e.subType === 'kamikaze') {
        const dx = player.pos.x + player.size.x/2 - (e.pos.x + e.size.x/2);
        e.velocity.x = dx * 0.05 * mults.speed; e.velocity.y += 0.05 * mults.speed;
      } else if (e.subType === 'super') {
        if (e.pos.y > 100) { e.velocity.y = 0;
          if (time - (e.lastShot || 0) > 1800 * mults.fire) {
            for (let ox = -1.5; ox <= 1.5; ox += 1.5) {
              bullets.push({ id: Math.random().toString(), pos: { x: e.pos.x + e.size.x/2, y: e.pos.y + e.size.y }, velocity: { x: ox, y: 5 * mults.speed }, damage: 8, owner: 'enemy', color: eColors.bullet });
            }
            e.lastShot = time;
          }
        }
      } else if (time - (e.lastShot || 0) > (ENEMY_FIRE_RATE / (level * 0.1 + 1)) * mults.fire) {
          bullets.push({ id: Math.random().toString(), pos: { x: e.pos.x + e.size.x/2, y: e.pos.y + e.size.y }, velocity: { x: 0, y: (3.5 + level * 0.4) * mults.speed }, damage: 5, owner: 'enemy', color: eColors.bullet });
          e.lastShot = time;
      }

      e.pos.x += e.velocity.x; e.pos.y += e.velocity.y;
      if (e.pos.x <= 0 || e.pos.x >= CANVAS_WIDTH - e.size.x) e.velocity.x *= -1;
      if (e.pos.y > CANVAS_HEIGHT) { enemies.splice(i, 1); continue; }

      if (e.pos.x < player.pos.x + player.size.x && e.pos.x + e.size.x > player.pos.x && e.pos.y < player.pos.y + player.size.y && e.pos.y + e.size.y > player.pos.y) {
        const nextHealth = Math.max(0, player.health - 25);
        player.health = nextHealth;
        setHealth(nextHealth);
        createParticles(e.pos.x + e.size.x/2, e.pos.y + e.size.y/2, eColors.main);
        enemies.splice(i, 1);
        if (nextHealth <= 0) setStatus(GameStatus.GAMEOVER);
      }
    }

    particles.forEach((p, idx) => { p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.life -= 0.025; if (p.life <= 0) particles.splice(idx, 1); });
    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [status, keys, level, getDifficultyMults]);

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    const state = gameStateRef.current;
    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 153) % CANVAS_WIDTH, (Date.now() / 30 + i * 100) % CANVAS_HEIGHT, 1, 1);
    state.particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1.0;

    drawShip(ctx, 'player', undefined, state.player.pos.x, state.player.pos.y, state.player.size.x, state.player.size.y);
    state.enemies.forEach(e => {
      drawShip(ctx, 'enemy', e.subType, e.pos.x, e.pos.y, e.size.x, e.size.y);
      if (e.subType === 'elite' || e.subType === 'super') {
        ctx.fillStyle = '#451a03'; ctx.fillRect(e.pos.x, e.pos.y - 12, e.size.x, 3);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(e.pos.x, e.pos.y - 12, e.size.x * (e.health / e.maxHealth), 3);
      }
    });

    state.bullets.forEach(b => {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, BULLET_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 8; ctx.shadowColor = b.color; ctx.stroke(); ctx.shadowBlur = 0;
    });
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => setKeys(p => ({ ...p, [e.key]: true }));
    const ku = (e: KeyboardEvent) => setKeys(p => ({ ...p, [e.key]: false }));
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => { requestRef.current = requestAnimationFrame(update); return () => cancelAnimationFrame(requestRef.current!); }, [update]);

  // Fix: Added effect to fetch briefing with all required arguments (level, score, language)
  useEffect(() => {
    getPilotBriefing(level, score, language).then(setBriefing);
  }, [level, score, language]);

  const UnitPreview = ({ type, subType, label, desc, hp, dmg, colorClass, bgClass }: any) => {
    const pc = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const r = () => { if (pc.current) { const x = pc.current.getContext('2d'); if (x) { x.clearRect(0, 0, 80, 80); drawShip(x, type, subType, 20, 20, 40, 40); } } requestAnimationFrame(r); };
      const h = requestAnimationFrame(r); return () => cancelAnimationFrame(h);
    }, [type, subType]);
    return (
      <div className={`p-4 rounded-xl border border-slate-700 ${bgClass} flex gap-4 items-center`}>
        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 shrink-0"><canvas ref={pc} width={80} height={80} className="w-16 h-16" /></div>
        <div className="flex-1">
          <h4 className={`text-lg font-bold italic uppercase ${colorClass}`}>{label}</h4>
          <p className="text-xs text-slate-400 italic mb-2">{desc}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800 text-[10px]"><span className="text-slate-500 uppercase">HP:</span> <span className="text-white font-mono">{hp}</span></div>
            <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800 text-[10px]"><span className="text-slate-500 uppercase">ATK:</span> <span className="text-white font-mono">{dmg}</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950 text-slate-100 font-orbitron">
      <div className="w-full max-w-[600px] flex justify-between items-center mb-4 px-4 bg-slate-900/50 py-3 rounded-lg border border-slate-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /><span className="text-xl font-mono">{score.toString().padStart(6, '0')}</span></div>
          <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-sky-400" /><span className="text-lg font-mono">{t.level}.{level}</span></div>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><div className={`h-full transition-all duration-300 ${health / maxHealth < 0.3 ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${(health / maxHealth) * 100}%` }} /></div>
            <span className={`text-[10px] font-bold uppercase ${difficulty === 'easy' ? 'text-green-500' : difficulty === 'hard' ? 'text-rose-500' : 'text-sky-400'}`}>{t[difficulty]} MODE</span>
          </div>
          <Shield className={`w-5 h-5 ${health / maxHealth < 0.3 ? 'text-rose-500 animate-pulse' : 'text-sky-400'}`} />
        </div>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-xl border-2 border-slate-800 shadow-2xl" />

        {status === GameStatus.START && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center rounded-xl p-8 text-center overflow-y-auto">
            <h1 className="text-5xl font-black mb-2 text-sky-400 tracking-tighter uppercase italic">{t.title}</h1>
            <p className="text-slate-400 mb-8 max-w-sm">{t.subtitle}</p>
            
            <div className="bg-slate-900/80 p-6 rounded-xl border border-sky-900/50 mb-8 w-full max-w-lg">
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-sky-400 mb-4"><Terminal className="w-4 h-4" /><span>{t.briefingTitle}</span></div>
              {briefing && (
                <div className="text-left space-y-4">
                  <h3 className="text-xl font-bold uppercase italic text-white tracking-widest border-l-4 border-sky-500 pl-3">{briefing.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-mono italic">{briefing.message}</p>
                  <div className="pt-3 border-t border-slate-800 bg-slate-950/40 p-3 rounded-lg">
                    <p className="text-xs font-bold uppercase text-sky-300 flex items-center gap-2 mb-1"><Zap className="w-3 h-3" /> {t.combatAdviceLabel}:</p>
                    <p className="text-xs text-slate-400 italic">{briefing.tacticalAdvice}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button onClick={initGame} className="flex items-center justify-center gap-3 px-10 py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-full transition-all transform hover:scale-105 active:scale-95"><Play className="fill-current w-5 h-5" /> {t.initiate}</button>
              <div className="flex gap-3">
                <button onClick={() => setShowIntel(true)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-full border border-sky-900/50 text-sm flex items-center justify-center gap-2"><Info className="w-4 h-4" />{t.intel}</button>
                <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full border border-slate-700"><Settings className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}

        {showIntel && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-20 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-slate-900 border border-sky-500/30 rounded-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-sky-500/20 flex justify-between items-center bg-sky-500/10">
                <div className="flex items-center gap-3 text-sky-400"><Activity /><h2 className="text-xl font-bold uppercase tracking-widest italic">{t.intelTitle}</h2></div>
                <button onClick={() => setShowIntel(false)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-full"><X /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 scrollbar-hide">
                <section>
                  <div className="flex items-center gap-2 mb-4"><div className="w-2 h-6 bg-sky-500 rounded-full" /><h3 className="text-lg font-bold text-white uppercase">{t.vanguard}</h3></div>
                  <UnitPreview type="player" label={t.vanguard} desc={t.subtitle} hp={maxHealth} dmg="1" colorClass="text-sky-400" bgClass="bg-sky-500/5" />
                </section>
                <section>
                  <div className="flex items-center gap-2 mb-4"><div className="w-2 h-6 bg-rose-500 rounded-full" /><h3 className="text-lg font-bold text-white uppercase">{t.enemyFleetTitle}</h3></div>
                  <div className="grid gap-4">
                    <UnitPreview type="enemy" subType="grunt" label={t.swarm} desc={t.swarmDesc} hp="1+LV" dmg="5" colorClass="text-teal-400" bgClass="bg-teal-500/5" />
                    <UnitPreview type="enemy" subType="kamikaze" label={t.kamikaze} desc={t.kamikazeDesc} hp="1" dmg="40" colorClass="text-orange-400" bgClass="bg-orange-500/5" />
                    <UnitPreview type="enemy" subType="elite" label={t.elite} desc={t.eliteDesc} hp="6+LV" dmg="5" colorClass="text-purple-400" bgClass="bg-purple-500/5" />
                    <UnitPreview type="enemy" subType="super" label={t.super} desc={t.superDesc} hp="12+LV" dmg="8x3" colorClass="text-rose-400" bgClass="bg-rose-500/5" />
                  </div>
                </section>
              </div>
              <div className="p-4 border-t border-sky-500/20 text-center"><button onClick={() => setShowIntel(false)} className="px-10 py-2 bg-sky-500 text-slate-950 font-bold rounded-full uppercase italic">{t.backHome}</button></div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-30 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-8 text-sky-400"><h2 className="text-xl font-bold uppercase italic">{t.settings}</h2><button onClick={() => setShowSettings(false)}><X /></button></div>
              <div className="space-y-6">
                <div><label className="text-slate-400 text-[10px] uppercase block mb-2">{t.langName}</label>
                  <div className="grid grid-cols-5 gap-2">{(Object.keys(translations) as Language[]).map(l => <button key={l} onClick={() => setLanguage(l)} className={`py-2 rounded font-bold text-xs ${language === l ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'}`}>{l.toUpperCase()}</button>)}</div>
                </div>
                <div><label className="text-slate-400 text-[10px] uppercase block mb-2">{t.difficulty}</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl">{(['easy', 'normal', 'hard'] as Difficulty[]).map(d => <button key={d} onClick={() => setDifficulty(d)} className={`py-2 rounded font-black text-[10px] ${difficulty === d ? (d === 'easy' ? 'bg-green-500 text-slate-950' : d === 'hard' ? 'bg-rose-500 text-slate-950' : 'bg-sky-500 text-slate-950') : 'text-slate-500'}`}>{t[d]}</button>)}</div>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl uppercase">OK</button>
            </div>
          </div>
        )}

        {status === GameStatus.GAMEOVER && (
          <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-lg flex flex-col items-center justify-center rounded-xl p-8 text-center z-50">
            <h2 className="text-6xl font-black mb-2 text-rose-500 italic uppercase">{t.missionFailed}</h2>
            <div className="mb-8"><span className="text-slate-400 text-xs block uppercase mb-1">{t.finalScore}</span><span className="text-4xl font-mono font-bold text-white">{score.toLocaleString()}</span></div>
            <div className="flex flex-col gap-3">
              <button onClick={initGame} className="flex items-center justify-center gap-3 px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full transform hover:scale-110"><RotateCcw className="w-5 h-5" /> {t.redeploy}</button>
              <button onClick={returnToHome} className="flex items-center justify-center gap-3 px-10 py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full transform hover:scale-110"><Terminal className="w-5 h-5" /> {t.backHome}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
