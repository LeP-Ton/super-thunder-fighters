import React from 'react';
import { PlaneId } from '../types';
import { PLANE_BY_ID, ENERGY_MAX } from '../planes';
import { Translation } from '../i18n';
import { modelPreviews } from '../render/modelManifest';

interface PlaneSwitchBarProps {
  selectedPlanes: PlaneId[];
  activePlaneId: PlaneId;
  energy: number;
  onSwitch: (planeId: PlaneId) => void;
  t: Translation;
}

export const PlaneSwitchBar: React.FC<PlaneSwitchBarProps> = ({ selectedPlanes, activePlaneId, energy, onSwitch, t }) => (
  <div className="switch-bar">
    <span className="switch-caption">{t.hangarTitle} / 03</span>
    <div className="switch-slots">
      {selectedPlanes.map((planeId, idx) => {
        const isActive = planeId === activePlaneId;
        const canSwitch = energy >= ENERGY_MAX && !isActive;
        return <button key={planeId} className={'switch-slot ' + (isActive ? 'active' : '')} onClick={() => onSwitch(planeId)} disabled={!canSwitch}>
          <span>{idx + 1}</span><img src={modelPreviews[planeId]} alt="" /><b>{t.planeNames[planeId] ?? PLANE_BY_ID[planeId].name}</b>{canSwitch && <em>{t.ready}</em>}
        </button>;
      })}
    </div>
    <span className="switch-energy">{energy}/{ENERGY_MAX}</span>
  </div>
);
