import React, { useEffect, useRef } from 'react';
import { Crosshair, X } from 'lucide-react';
import { GameStatus, PlaneDef, PlaneId } from '../types';
import { Translation } from '../i18n';
import { drawShip } from '../render/ships';

interface HangarModalProps {
  t: Translation;
  planes: PlaneDef[];
  selectedPlanes: PlaneId[];
  status: GameStatus;
  hpScale: number;
  canStart: boolean;
  onTogglePlane: (planeId: PlaneId) => void;
  onClose: () => void;
}

export const HangarModal: React.FC<HangarModalProps> = ({
  t,
  planes,
  selectedPlanes,
  status,
  hpScale,
  canStart,
  onTogglePlane,
  onClose
}) => {
  const hangarCountLabel = t.hangarCount.replace('{count}', String(selectedPlanes.length));
  const PlaneIcon: React.FC<{ planeId: PlaneId }> = ({ planeId }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const render = () => {
        const ctx = ref.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 80, 80);
          drawShip(ctx, 'player', undefined, 20, 20, 40, 40, planeId);
        }
        requestAnimationFrame(render);
      };
      const raf = requestAnimationFrame(render);
      return () => cancelAnimationFrame(raf);
    }, [planeId]);
    return <canvas ref={ref} width={80} height={80} className="w-16 h-16" />;
  };
  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-25 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-sky-500/30 rounded-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-sky-500/20 flex justify-between items-center bg-sky-500/10">
          <div className="flex items-center gap-3 text-sky-400">
            <Crosshair />
            <h2 className="text-xl font-bold uppercase tracking-widest italic">{t.hangarTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 rounded-full">
            <X />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 scrollbar-hide">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">{t.hangarHint}</p>
            <span className={`text-[10px] font-bold uppercase ${canStart ? 'text-slate-400' : 'text-amber-400'}`}>{hangarCountLabel}</span>
          </div>
          <div className="grid gap-3">
            {planes.map((plane) => {
              const selected = selectedPlanes.includes(plane.id);
              const isLocked = !selected && selectedPlanes.length >= 3;
              const displayHp = Math.round(plane.maxHealth * hpScale);
              const rof = Math.round((1000 / plane.fireRate) * 10) / 10;
              const displayName = t.planeNames?.[plane.id] ?? plane.name;
              const roleText = t.planeRoles?.[plane.id] ?? plane.role;
              const traitText = t.planeTraits?.[plane.id] ?? plane.trait;
              return (
                <button
                  key={plane.id}
                  onClick={() => onTogglePlane(plane.id)}
                  disabled={status !== GameStatus.START || isLocked}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selected ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-900/40'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-500'}`}
                >
                  <div className="flex gap-3 items-start">
                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 shrink-0">
                      <PlaneIcon planeId={plane.id} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selected ? 'bg-sky-400' : 'bg-slate-600'}`} />
                          <span className="text-sm font-bold text-white">{displayName}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide">{roleText}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 mb-3">{traitText}</div>
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-300">
                        <div className="bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">{t.hp} {displayHp}</div>
                        <div className="bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">{t.speed} {plane.speed.toFixed(1)}</div>
                        <div className="bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">{t.fireRate} {rof}/s</div>
                        <div className="bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">{t.dmg} {plane.bulletDamage}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-sky-500/20 text-center">
          <button onClick={onClose} className="px-10 py-2 bg-sky-500 text-slate-950 font-bold rounded-full uppercase italic">
            {t.backHome}
          </button>
        </div>
      </div>
    </div>
  );
};
