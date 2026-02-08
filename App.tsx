
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, GameState, Difficulty, PlaneId } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BULLET_RADIUS } from './constants';
import { PLANE_DEFS, PLANE_BY_ID, DEFAULT_LOADOUT, ENERGY_MAX } from './planes';
import { getPilotBriefing, Briefing } from './services/geminiService';
import { translations, Language } from './i18n';
import { drawShip } from './render/ships';
import { updateGame } from './game/engine';
import { buildPlaneStates } from './game/state';
import { getDifficultyMults } from './game/difficulty';
import { HudBar } from './components/HudBar';
import { PlaneSwitchBar } from './components/PlaneSwitchBar';
import { StartOverlay } from './components/StartOverlay';
import { IntelModal } from './components/IntelModal';
import { HangarModal } from './components/HangarModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverOverlay, PauseOverlay } from './components/Overlays';

// --- Main App Component ---

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const defaultPlane = PLANE_BY_ID[DEFAULT_LOADOUT[0]];
  const [health, setHealth] = useState(defaultPlane.maxHealth);
  const [maxHealth, setMaxHealth] = useState(defaultPlane.maxHealth);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [showIntel, setShowIntel] = useState(false);
  const [showHangar, setShowHangar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [selectedPlanes, setSelectedPlanes] = useState<PlaneId[]>(DEFAULT_LOADOUT);
  const [activePlaneId, setActivePlaneId] = useState<PlaneId>(DEFAULT_LOADOUT[0]);
  const [energy, setEnergy] = useState(0);

  const t = translations[language];

  

  const gameStateRef = useRef<GameState>({
    player: {
      id: 'p',
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
      size: { x: defaultPlane.size, y: defaultPlane.size },
      velocity: { x: 0, y: 0 },
      health: defaultPlane.maxHealth,
      maxHealth: defaultPlane.maxHealth,
      type: 'player'
    },
    enemies: [],
    bullets: [],
    particles: [],
    score: 0,
    level: 1,
    status: GameStatus.START,
    difficulty: 'normal',
    activePlaneId: DEFAULT_LOADOUT[0],
    planeStates: buildPlaneStates('normal'),
    energy: 0
  });

  const requestRef = useRef<number>();
  const lastTickRef = useRef<number>(0);

  const returnToHome = () => {
    const loadout = selectedPlanes.length === 3 ? selectedPlanes : DEFAULT_LOADOUT;
    const planeStates = buildPlaneStates(difficulty);
    const starterId = loadout[0];
    const starterDef = PLANE_BY_ID[starterId];
    const starterState = planeStates[starterId];

    setScore(0);
    setLevel(1);
    setEnergy(0);
    setActivePlaneId(starterId);
    setHealth(starterState.health);
    setMaxHealth(starterState.maxHealth);
    setShowIntel(false);
    setShowHangar(false);
    setShowSettings(false);

    gameStateRef.current = {
      player: {
        id: 'player',
        pos: { x: CANVAS_WIDTH / 2 - starterDef.size / 2, y: CANVAS_HEIGHT - 100 },
        size: { x: starterDef.size, y: starterDef.size },
        velocity: { x: 0, y: 0 },
        health: starterState.health,
        maxHealth: starterState.maxHealth,
        type: 'player',
        lastShot: starterState.lastShot
      },
      enemies: [],
      bullets: [],
      particles: [],
      score: 0,
      level: 1,
      status: GameStatus.START,
      difficulty: difficulty,
      activePlaneId: starterId,
      planeStates: planeStates,
      energy: 0
    };
    setStatus(GameStatus.START);
  };

  const initGame = () => {
    if (selectedPlanes.length !== 3) return;
    const planeStates = buildPlaneStates(difficulty);
    const starterId = selectedPlanes[0];
    const starterDef = PLANE_BY_ID[starterId];
    const starterState = planeStates[starterId];

    setScore(0);
    setLevel(1);
    setEnergy(0);
    setActivePlaneId(starterId);
    setHealth(starterState.health);
    setMaxHealth(starterState.maxHealth);
    setShowIntel(false);
    setShowHangar(false);
    setShowSettings(false);

    gameStateRef.current = {
      player: {
        id: 'player',
        pos: { x: CANVAS_WIDTH / 2 - starterDef.size / 2, y: CANVAS_HEIGHT - 100 },
        size: { x: starterDef.size, y: starterDef.size },
        velocity: { x: 0, y: 0 },
        health: starterState.health,
        maxHealth: starterState.maxHealth,
        type: 'player',
        lastShot: starterState.lastShot
      },
      enemies: [],
      bullets: [],
      particles: [],
      score: 0,
      level: 1,
      status: GameStatus.PLAYING,
      difficulty: difficulty,
      activePlaneId: starterId,
      planeStates: planeStates,
      energy: 0
    };
    setStatus(GameStatus.PLAYING);
  };

  const canStart = selectedPlanes.length === 3;

  const togglePlaneSelection = (planeId: PlaneId) => {
    setSelectedPlanes((prev) => {
      if (prev.includes(planeId)) {
        return prev.filter((id) => id !== planeId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, planeId];
    });
  };

  const switchToPlane = useCallback((planeId: PlaneId) => {
    const state = gameStateRef.current;
    if (status !== GameStatus.PLAYING) return;
    if (!selectedPlanes.includes(planeId)) return;
    if (planeId === state.activePlaneId) return;
    const targetPlane = PLANE_BY_ID[planeId];
    if (!targetPlane) return;
    if (state.energy < ENERGY_MAX) return;

    const currentId = state.activePlaneId;
    state.planeStates[currentId] = {
      ...state.planeStates[currentId],
      health: state.player.health,
      lastShot: state.player.lastShot || 0
    };

    state.energy = 0;
    setEnergy(state.energy);

    const targetState = state.planeStates[planeId];
    const centerX = state.player.pos.x + state.player.size.x / 2;
    const centerY = state.player.pos.y + state.player.size.y / 2;
    state.activePlaneId = planeId;
    setActivePlaneId(planeId);
    state.player.size = { x: targetPlane.size, y: targetPlane.size };
    state.player.pos.x = centerX - targetPlane.size / 2;
    state.player.pos.y = centerY - targetPlane.size / 2;
    state.player.health = targetState.health;
    state.player.maxHealth = targetState.maxHealth;
    state.player.lastShot = targetState.lastShot || 0;
    setHealth(targetState.health);
    setMaxHealth(targetState.maxHealth);
  }, [selectedPlanes, status]);

  const attemptSwitchToSlot = useCallback((slotIndex: number) => {
    const planeId = selectedPlanes[slotIndex];
    if (!planeId) return;
    switchToPlane(planeId);
  }, [selectedPlanes, switchToPlane]);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 153) % CANVAS_WIDTH, (Date.now() / 30 + i * 100) % CANVAS_HEIGHT, 1, 1);
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    drawShip(ctx, 'player', undefined, state.player.pos.x, state.player.pos.y, state.player.size.x, state.player.size.y, state.activePlaneId);
    state.enemies.forEach(e => {
      drawShip(ctx, 'enemy', e.subType, e.pos.x, e.pos.y, e.size.x, e.size.y);
      if (e.subType === 'elite' || e.subType === 'super') {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(e.pos.x, e.pos.y - 12, e.size.x, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(e.pos.x, e.pos.y - 12, e.size.x * (e.health / e.maxHealth), 3);
      }
    });

    state.bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = b.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }, []);

  const update = useCallback((time: number) => {
    const shouldContinue = updateGame({
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
    });
    if (shouldContinue) requestRef.current = requestAnimationFrame(update);
  }, [status, keys, defaultPlane, draw]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setKeys({});
        setStatus(prev => (prev === GameStatus.PLAYING ? GameStatus.PAUSED : prev === GameStatus.PAUSED ? GameStatus.PLAYING : prev));
        return;
      }
      if (status === GameStatus.PLAYING && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault();
        attemptSwitchToSlot(Number(e.key) - 1);
        return;
      }
      setKeys(p => ({ ...p, [e.key]: true }));
    };
    const ku = (e: KeyboardEvent) => setKeys(p => ({ ...p, [e.key]: false }));
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [attemptSwitchToSlot, status]);

  useEffect(() => {
    if (!selectedPlanes.includes(activePlaneId)) {
      const nextId = selectedPlanes[0] || DEFAULT_LOADOUT[0];
      setActivePlaneId(nextId);
    }
  }, [activePlaneId, selectedPlanes]);

  useEffect(() => { requestRef.current = requestAnimationFrame(update); return () => cancelAnimationFrame(requestRef.current!); }, [update]);

  useEffect(() => {
    getPilotBriefing(level, score, language).then(setBriefing);
  }, [level, score, language]);

  const hpScale = getDifficultyMults(difficulty).playerHp / 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950 text-slate-100 font-orbitron">
      <HudBar score={score} level={level} health={health} maxHealth={maxHealth} energy={energy} difficulty={difficulty} t={t} />

      {status === GameStatus.PLAYING && (
        <PlaneSwitchBar selectedPlanes={selectedPlanes} activePlaneId={activePlaneId} energy={energy} onSwitch={switchToPlane} t={t} />
      )}

      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-xl border-2 border-slate-800 shadow-2xl" />

        {status === GameStatus.START && (
          <StartOverlay
            t={t}
            briefing={briefing}
            canStart={canStart}
            onStart={initGame}
            onShowIntel={() => setShowIntel(true)}
            onShowHangar={() => setShowHangar(true)}
            onShowSettings={() => setShowSettings(true)}
          />
        )}

        {showIntel && <IntelModal t={t} onClose={() => setShowIntel(false)} />}
        {showHangar && (
          <HangarModal
            t={t}
            planes={PLANE_DEFS}
            selectedPlanes={selectedPlanes}
            status={status}
            hpScale={hpScale}
            canStart={canStart}
            onTogglePlane={togglePlaneSelection}
            onClose={() => setShowHangar(false)}
          />
        )}
        {showSettings && (
          <SettingsModal
            t={t}
            language={language}
            difficulty={difficulty}
            onChangeLanguage={setLanguage}
            onChangeDifficulty={setDifficulty}
            onClose={() => setShowSettings(false)}
          />
        )}

        {status === GameStatus.GAMEOVER && <GameOverOverlay t={t} score={score} onRedeploy={initGame} onBackHome={returnToHome} />}
        {status === GameStatus.PAUSED && <PauseOverlay t={t} onResume={() => setStatus(GameStatus.PLAYING)} onBackHome={returnToHome} />}
      </div>
    </div>
  );
};

export default App;
