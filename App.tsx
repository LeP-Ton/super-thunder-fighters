import React, { useState, useEffect, useCallback, useRef } from "react";
import { GameStatus, GameState, Difficulty, PlaneId } from "./types";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { PLANE_DEFS, PLANE_BY_ID, DEFAULT_LOADOUT, ENERGY_MAX } from "./planes";
import { getPilotBriefing, Briefing } from "./services/geminiService";
import { translations, Language } from "./i18n";
import { drawProjectile, drawShip } from "./render/ships";
import { modelPreviews } from "./render/modelManifest";
import { drawBackground } from "./render/background";
import { BattleScene } from "./render/battleScene";
import { updateGame } from "./game/engine";
import { advanceFixedClock, createFixedClock } from "./game/fixedStep";
import { buildPlaneStates } from "./game/state";
import { getDifficultyMults } from "./game/difficulty";
import { HudBar } from "./components/HudBar";
import { PlaneSwitchBar } from "./components/PlaneSwitchBar";
import { presentationCopy } from "./components/presentationCopy";
import { Settings2, ArrowLeft, Crosshair, Layers } from "lucide-react";
import { StartOverlay } from "./components/StartOverlay";
import { IntelModal } from "./components/IntelModal";
import { HangarModal } from "./components/HangarModal";
import { SettingsModal } from "./components/SettingsModal";
import { GameOverOverlay, PauseOverlay } from "./components/Overlays";

const controlHints: Record<Language, { touch: string; keyboard: string }> = {
  zh: {
    touch: "拖动战机 · 自动开火 · 点击战机切换",
    keyboard: "WASD / 方向键移动 · 空格 / Enter 开火 · 1–3 切换 · Esc 暂停",
  },
  en: {
    touch: "Drag to move · Auto fire · Tap a fighter to switch",
    keyboard:
      "WASD / Arrows to move · Space / Enter to fire · 1–3 to switch · Esc to pause",
  },
  ja: {
    touch: "ドラッグで移動 · 自動射撃 · 機体をタップして切替",
    keyboard:
      "WASD / 矢印キーで移動 · Space / Enter で射撃 · 1–3 で切替 · Esc で一時停止",
  },
  ko: {
    touch: "드래그 이동 · 자동 발사 · 전투기를 탭해 교체",
    keyboard:
      "WASD / 방향키 이동 · Space / Enter 발사 · 1–3 교체 · Esc 일시정지",
  },
  ru: {
    touch:
      "Перетаскивайте для движения · Автоогонь · Нажмите на истребитель для смены",
    keyboard:
      "WASD / стрелки — движение · Space / Enter — огонь · 1–3 — смена · Esc — пауза",
  },
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const battleSceneRef = useRef<BattleScene | null>(null);
  const pixelRatioRef = useRef(1);
  const [visualsReady, setVisualsReady] = useState(false);
  const touchTargetRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const defaultPlane = PLANE_BY_ID[DEFAULT_LOADOUT[0]];
  const [health, setHealth] = useState(defaultPlane.maxHealth);
  const [maxHealth, setMaxHealth] = useState(defaultPlane.maxHealth);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const [showIntel, setShowIntel] = useState(false);
  const [showHangar, setShowHangar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<Language>("zh");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [selectedPlanes, setSelectedPlanes] =
    useState<PlaneId[]>(DEFAULT_LOADOUT);
  const [activePlaneId, setActivePlaneId] = useState<PlaneId>(
    DEFAULT_LOADOUT[0],
  );
  const [energy, setEnergy] = useState(0);

  const t = translations[language];
  const copy = presentationCopy[language];

  useEffect(() => {
    document.title = t.title;
    document.documentElement.lang = language;
  }, [language, t.title]);

  const gameStateRef = useRef<GameState>({
    player: {
      id: "p",
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
      size: { x: defaultPlane.size, y: defaultPlane.size },
      velocity: { x: 0, y: 0 },
      health: defaultPlane.maxHealth,
      maxHealth: defaultPlane.maxHealth,
      type: "player",
    },
    enemies: [],
    bullets: [],
    particles: [],
    score: 0,
    level: 1,
    status: GameStatus.START,
    difficulty: "normal",
    activePlaneId: DEFAULT_LOADOUT[0],
    planeStates: buildPlaneStates("normal"),
    energy: 0,
  });

  const requestRef = useRef<number>();
  const clockRef = useRef(createFixedClock());

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const syncInput = () => setIsTouchDevice(query.matches);
    syncInput();
    query.addEventListener("change", syncInput);
    return () => query.removeEventListener("change", syncInput);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncResolution = () => {
      if (battleSceneRef.current) {
        battleSceneRef.current.resize();
        return;
      }
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      pixelRatioRef.current = ratio;
      canvas.width = Math.round(CANVAS_WIDTH * ratio);
      canvas.height = Math.round(CANVAS_HEIGHT * ratio);
    };
    syncResolution();
    window.addEventListener("resize", syncResolution);
    return () => window.removeEventListener("resize", syncResolution);
  }, []);

  const returnToHome = () => {
    keysRef.current = {};
    touchTargetRef.current = null;
    activePointerRef.current = null;
    const loadout =
      selectedPlanes.length === 3 ? selectedPlanes : DEFAULT_LOADOUT;
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
        id: "player",
        pos: {
          x: CANVAS_WIDTH / 2 - starterDef.size / 2,
          y: CANVAS_HEIGHT - 100,
        },
        size: { x: starterDef.size, y: starterDef.size },
        velocity: { x: 0, y: 0 },
        health: starterState.health,
        maxHealth: starterState.maxHealth,
        type: "player",
        lastShot: starterState.lastShot,
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
      energy: 0,
    };
    setStatus(GameStatus.START);
  };

  const initGame = () => {
    if (selectedPlanes.length !== 3) return;
    keysRef.current = {};
    touchTargetRef.current = null;
    activePointerRef.current = null;
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
        id: "player",
        pos: {
          x: CANVAS_WIDTH / 2 - starterDef.size / 2,
          y: CANVAS_HEIGHT - 100,
        },
        size: { x: starterDef.size, y: starterDef.size },
        velocity: { x: 0, y: 0 },
        health: starterState.health,
        maxHealth: starterState.maxHealth,
        type: "player",
        lastShot: starterState.lastShot,
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
      energy: 0,
    };
    setStatus(GameStatus.PLAYING);
  };

  const canStart = selectedPlanes.length === 3 && visualsReady;

  const togglePlaneSelection = (planeId: PlaneId) => {
    setSelectedPlanes((prev) => {
      if (prev.includes(planeId)) {
        return prev.filter((id) => id !== planeId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, planeId];
    });
  };

  const switchToPlane = useCallback(
    (planeId: PlaneId) => {
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
        lastShot: state.player.lastShot || 0,
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
    },
    [selectedPlanes, status],
  );

  const attemptSwitchToSlot = useCallback(
    (slotIndex: number) => {
      const planeId = selectedPlanes[slotIndex];
      if (!planeId) return;
      switchToPlane(planeId);
    },
    [selectedPlanes, switchToPlane],
  );

  const draw = useCallback((time = performance.now()) => {
    if (battleSceneRef.current) {
      battleSceneRef.current.render(gameStateRef.current, time);
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const state = gameStateRef.current;
    ctx.setTransform(pixelRatioRef.current, 0, 0, pixelRatioRef.current, 0, 0);
    drawBackground(ctx, time);
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(0.5, p.life * 2);
      ctx.shadowColor = "#f1c091";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(p.pos.x, p.pos.y);
      ctx.lineTo(p.pos.x - p.velocity.x * 2.2, p.pos.y - p.velocity.y * 2.2);
      ctx.stroke();
      ctx.fillStyle = "#f6dfb2";
      ctx.fillRect(p.pos.x - 1, p.pos.y - 1, 2, 2);
      ctx.restore();
    });

    drawShip(
      ctx,
      "player",
      undefined,
      state.player.pos.x,
      state.player.pos.y,
      state.player.size.x,
      state.player.size.y,
      state.activePlaneId,
      time,
    );
    state.enemies.forEach((e) => {
      drawShip(
        ctx,
        "enemy",
        e.subType,
        e.pos.x,
        e.pos.y,
        e.size.x,
        e.size.y,
        undefined,
        time,
      );
      if (e.subType === "elite" || e.subType === "super") {
        ctx.fillStyle = "#13212c";
        ctx.fillRect(e.pos.x, e.pos.y - 13, e.size.x, 4);
        ctx.fillStyle = "#e69c6b";
        ctx.shadowColor = "#e69c6b";
        ctx.shadowBlur = 3;
        ctx.fillRect(
          e.pos.x,
          e.pos.y - 13,
          e.size.x * (e.health / e.maxHealth),
          4,
        );
        ctx.shadowBlur = 0;
      }
    });

    state.bullets.forEach((b) => drawProjectile(ctx, b));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;
    try {
      const battleScene = new BattleScene(canvas);
      battleSceneRef.current = battleScene;
      battleScene.render(gameStateRef.current, performance.now());
      battleScene.loadModels().finally(() => {
        if (!mounted) return;
        setVisualsReady(true);
        battleScene.render(gameStateRef.current, performance.now());
      });
    } catch (error) {
      console.warn("WebGL 2 不可用，启用 Canvas 2D 画面。", error);
      setVisualsReady(true);
      draw();
    }
    return () => {
      mounted = false;
      battleSceneRef.current?.dispose();
      battleSceneRef.current = null;
    };
  }, [draw]);

  const update = useCallback(
    (time: number) => {
      const { updated, shouldContinue } = advanceFixedClock(
        clockRef.current,
        time,
        (stepTime) => {
          return updateGame({
            time: stepTime,
            status,
            keys: keysRef.current,
            gameStateRef,
            defaultPlane,
            touchTargetRef,
            autoFire: isTouchDevice,
            setScore,
            setLevel,
            setEnergy,
            setHealth,
            setStatus,
          });
        },
      );
      if (updated || battleSceneRef.current) draw(time);
      if (shouldContinue) requestRef.current = requestAnimationFrame(update);
    },
    [status, defaultPlane, draw, isTouchDevice],
  );

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        keysRef.current = {};
        setStatus((prev) =>
          prev === GameStatus.PLAYING
            ? GameStatus.PAUSED
            : prev === GameStatus.PAUSED
              ? GameStatus.PLAYING
              : prev,
        );
        return;
      }
      if (
        status === GameStatus.PLAYING &&
        (e.key === "1" || e.key === "2" || e.key === "3")
      ) {
        e.preventDefault();
        attemptSwitchToSlot(Number(e.key) - 1);
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      )
        e.preventDefault();
      keysRef.current[e.key] = true;
    };
    const ku = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    const clearInput = () => {
      keysRef.current = {};
      clockRef.current = createFixedClock();
    };
    const handleVisibilityChange = () => {
      clearInput();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptSwitchToSlot, status]);

  useEffect(() => {
    if (!selectedPlanes.includes(activePlaneId)) {
      const nextId = selectedPlanes[0] || DEFAULT_LOADOUT[0];
      setActivePlaneId(nextId);
    }
  }, [activePlaneId, selectedPlanes]);

  useEffect(() => {
    clockRef.current = createFixedClock();
    if (status !== GameStatus.PLAYING) return;
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [status, update]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) draw();
  }, [status, draw]);

  useEffect(() => {
    getPilotBriefing(level, score, language).then(setBriefing);
  }, [level, score, language]);

  const hpScale = getDifficultyMults(difficulty).playerHp / 100;

  const updateTouchTarget = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    touchTargetRef.current = {
      x: ((event.clientX - bounds.left) * CANVAS_WIDTH) / bounds.width,
      y: ((event.clientY - bounds.top) * CANVAS_HEIGHT) / bounds.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (status !== GameStatus.PLAYING || event.pointerType === "mouse") return;
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateTouchTarget(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current === event.pointerId) updateTouchTarget(event);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current === event.pointerId) {
      activePointerRef.current = null;
      touchTargetRef.current = null;
    }
  };

  return (
    <div
      className={
        "app-shell " +
        (status === GameStatus.START ? "home-shell" : "combat-shell")
      }
    >
      <header className="site-header">
        <button
          className="brand-lockup"
          onClick={returnToHome}
          aria-label={t.backHome}
        >
          <svg
            className="brand-mark"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 3 25 17 37 11 30 27 22 32 20 38 18 32 10 27 3 11 15 17Z"
              fill="currentColor"
            />
            <path
              d="M20 12v15M12 20l8 7 8-7"
              stroke="#15191a"
              strokeWidth="2"
            />
          </svg>
          <span>
            {t.title}
            <small>SUPER THUNDER / {copy.division}</small>
          </span>
        </button>
        {status === GameStatus.START ? (
          <nav className="main-nav">
            <button onClick={() => setShowHangar(true)}>
              <Layers size={15} />
              {t.hangarTitle}
            </button>
            <button onClick={() => setShowIntel(true)}>
              <Crosshair size={15} />
              {t.intel}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label={t.settings}
            >
              <Settings2 size={17} />
              <span>{t.settings}</span>
            </button>
          </nav>
        ) : (
          <button
            className="text-button return-command"
            onClick={() => {
              keysRef.current = {};
              touchTargetRef.current = null;
              setStatus(GameStatus.PAUSED);
            }}
          >
            <ArrowLeft size={16} />
            {t.pauseTitle}
          </button>
        )}
      </header>
      {status === GameStatus.START && (
        <StartOverlay
          t={t}
          copy={copy}
          selectedPlanes={selectedPlanes}
          canStart={canStart}
          obscured={showHangar || showIntel || showSettings}
          onStart={initGame}
          onShowIntel={() => setShowIntel(true)}
          onShowHangar={() => setShowHangar(true)}
          onShowSettings={() => setShowSettings(true)}
        />
      )}
      <main className="combat-layout" hidden={status === GameStatus.START}>
        <aside className="mission-sidebar">
          <div className="operation-label">
            <span />
            {copy.operation}
          </div>
          <h2>{copy.location}</h2>
          <div className="mission-map">
            <div />
            <span>07</span>
            <i />
          </div>
          <p className="eyebrow">{t.briefingTitle}</p>
          <p className="mission-advice">
            {briefing?.tacticalAdvice || t.combatAdviceLabel}
          </p>
          <div className="mission-controls">
            <p>
              <kbd>W A S D</kbd>
              {isTouchDevice
                ? controlHints[language].touch
                : controlHints[language].keyboard}
            </p>
          </div>
        </aside>
        <section
          className={
            "play-column" + (status === GameStatus.PLAYING ? " is-playing" : "")
          }
        >
          <div className="game-stage">
            <canvas
              ref={canvasRef}
              className="battle-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            />
            <HudBar
              score={score}
              level={level}
              health={health}
              maxHealth={maxHealth}
              energy={energy}
              difficulty={difficulty}
              t={t}
            />
            {status === GameStatus.PLAYING && (
              <button
                className="stage-pause"
                onClick={() => {
                  touchTargetRef.current = null;
                  keysRef.current = {};
                  setStatus(GameStatus.PAUSED);
                }}
                aria-label={t.pauseTitle}
              >
                Ⅱ
              </button>
            )}
            {status === GameStatus.GAMEOVER && (
              <GameOverOverlay
                t={t}
                score={score}
                onRedeploy={initGame}
                onBackHome={returnToHome}
              />
            )}
            {status === GameStatus.PAUSED && (
              <PauseOverlay
                t={t}
                onResume={() => setStatus(GameStatus.PLAYING)}
                onBackHome={returnToHome}
              />
            )}
          </div>
          <PlaneSwitchBar
            selectedPlanes={selectedPlanes}
            activePlaneId={activePlaneId}
            energy={energy}
            onSwitch={switchToPlane}
            t={t}
          />
        </section>
        <aside className="flight-sidebar">
          <span className="eyebrow">{copy.specification}</span>
          <div className="active-aircraft">
            <img src={modelPreviews[activePlaneId]} alt="" />
            <span>ST / {activePlaneId.toUpperCase()}</span>
            <h2>{t.planeNames[activePlaneId]}</h2>
            <p>{t.planeRoles[activePlaneId]}</p>
          </div>
          <p className="flight-trait">{t.planeTraits[activePlaneId]}</p>
          <div className="flight-status">
            <span className="live-indicator" />
            {copy.ready}
          </div>
          <p className="switch-help">{t.readyAtFull}</p>
        </aside>
      </main>
      {showIntel && (
        <IntelModal t={t} copy={copy} onClose={() => setShowIntel(false)} />
      )}
      {showHangar && (
        <HangarModal
          t={t}
          copy={copy}
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
      <footer className="app-footer">
        <span>ST / ORBITAL DEFENSE</span>
        <span>
          <i />
          {copy.ready}
        </span>
        <span>© 2026 · SUPER THUNDER</span>
      </footer>
    </div>
  );
};

export default App;
