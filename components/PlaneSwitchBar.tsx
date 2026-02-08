import React from 'react';
import { PlaneId } from '../types';
import { PLANE_BY_ID, ENERGY_MAX } from '../planes';
import { Translation } from '../i18n';

interface PlaneSwitchBarProps {
  selectedPlanes: PlaneId[];
  activePlaneId: PlaneId;
  energy: number;
  onSwitch: (planeId: PlaneId) => void;
  t: Translation;
}

export const PlaneSwitchBar: React.FC<PlaneSwitchBarProps> = ({ selectedPlanes, activePlaneId, energy, onSwitch, t }) => {
  return (
    <div className="w-full max-w-[600px] flex items-center justify-between mb-2 px-1">
      <div className="flex flex-wrap gap-2">
        {selectedPlanes.map((planeId, idx) => {
          const plane = PLANE_BY_ID[planeId];
          const displayName = t.planeNames?.[planeId] ?? plane.name;
          const isActive = planeId === activePlaneId;
          const canSwitch = energy >= ENERGY_MAX && !isActive;
          return (
            <button
              key={planeId}
              onClick={() => onSwitch(planeId)}
              disabled={!canSwitch}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all ${
                isActive ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'bg-slate-900/60 border-slate-700 text-slate-300'
              } ${canSwitch ? 'hover:border-slate-400' : 'opacity-50 cursor-not-allowed'}`}
            >
              <span className="text-[11px]">{idx + 1}</span>
              <span>{displayName}</span>
              {energy >= ENERGY_MAX && !isActive && <span className="text-amber-300">{t.ready}</span>}
            </button>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-400 uppercase">
        {t.energy}: {energy}/{ENERGY_MAX}
      </div>
    </div>
  );
};
