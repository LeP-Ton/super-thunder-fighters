import React, { useEffect, useRef } from 'react';
import { Activity, X } from 'lucide-react';
import { Translation } from '../i18n';
import { drawShip } from '../render/ships';

interface UnitPreviewProps {
  type: 'player' | 'enemy';
  subType?: 'grunt' | 'kamikaze' | 'elite' | 'super';
  label: string;
  desc: string;
  hp: string | number;
  dmg: string | number;
  colorClass: string;
  bgClass: string;
}

const UnitPreview: React.FC<UnitPreviewProps> = ({ type, subType, label, desc, hp, dmg, colorClass, bgClass }) => {
  const pc = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const r = () => {
      if (pc.current) {
        const x = pc.current.getContext('2d');
        if (x) {
          x.clearRect(0, 0, 80, 80);
          drawShip(x, type, subType, 20, 20, 40, 40);
        }
      }
      requestAnimationFrame(r);
    };
    const h = requestAnimationFrame(r);
    return () => cancelAnimationFrame(h);
  }, [type, subType]);

  return (
    <div className={`p-4 rounded-xl border border-slate-700 ${bgClass} flex gap-4 items-center`}>
      <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 shrink-0">
        <canvas ref={pc} width={80} height={80} className="w-16 h-16" />
      </div>
      <div className="flex-1">
        <h4 className={`text-lg font-bold italic uppercase ${colorClass}`}>{label}</h4>
        <p className="text-xs text-slate-400 italic mb-2">{desc}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800 text-[10px]">
            <span className="text-slate-500 uppercase">HP:</span> <span className="text-white font-mono">{hp}</span>
          </div>
          <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800 text-[10px]">
            <span className="text-slate-500 uppercase">ATK:</span> <span className="text-white font-mono">{dmg}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IntelModalProps {
  t: Translation;
  onClose: () => void;
}

export const IntelModal: React.FC<IntelModalProps> = ({ t, onClose }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-20 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-sky-500/30 rounded-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-sky-500/20 flex justify-between items-center bg-sky-500/10">
          <div className="flex items-center gap-3 text-sky-400">
            <Activity />
            <h2 className="text-xl font-bold uppercase tracking-widest italic">{t.intelTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 rounded-full">
            <X />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-hide">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-rose-500 rounded-full" />
              <h3 className="text-lg font-bold text-white uppercase">{t.enemyFleetTitle}</h3>
            </div>
            <div className="grid gap-4">
              <UnitPreview type="enemy" subType="grunt" label={t.swarm} desc={t.swarmDesc} hp="1+LV" dmg="5" colorClass="text-teal-400" bgClass="bg-teal-500/5" />
              <UnitPreview type="enemy" subType="kamikaze" label={t.kamikaze} desc={t.kamikazeDesc} hp="1" dmg="40" colorClass="text-orange-400" bgClass="bg-orange-500/5" />
              <UnitPreview type="enemy" subType="elite" label={t.elite} desc={t.eliteDesc} hp="6+LV" dmg="5" colorClass="text-purple-400" bgClass="bg-purple-500/5" />
              <UnitPreview type="enemy" subType="super" label={t.super} desc={t.superDesc} hp="12+LV" dmg="8x3" colorClass="text-rose-400" bgClass="bg-rose-500/5" />
            </div>
          </section>
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
