import React from 'react';
import { Check, X } from 'lucide-react';
import { GameStatus, PlaneDef, PlaneId } from '../types';
import { Translation } from '../i18n';
import { shipAssets } from '../render/ships';

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

export const HangarModal: React.FC<HangarModalProps> = ({ t, planes, selectedPlanes, status, hpScale, canStart, onTogglePlane, onClose }) => (
  <div className="screen-overlay modal-overlay">
    <div className="modal-panel wide-modal">
      <div className="modal-header"><div><span className="eyebrow">FLIGHT SYSTEM / HANGAR</span><h2>{t.hangarTitle}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.backHome}><X size={20} /></button></div>
      <div className="modal-intro"><p>{t.hangarHint}</p><strong className={canStart ? 'ready-text' : ''}>{t.hangarCount.replace('{count}', String(selectedPlanes.length))}</strong></div>
      <div className="modal-scroll"><div className="plane-grid">
        {planes.map((plane) => {
          const selected = selectedPlanes.includes(plane.id);
          const locked = !selected && selectedPlanes.length >= 3;
          return <button key={plane.id} className={'plane-card ' + (selected ? 'selected' : '')} onClick={() => onTogglePlane(plane.id)} disabled={status !== GameStatus.START || locked} aria-pressed={selected}>
            <div className="plane-card-art"><img src={shipAssets[plane.id]} alt="" /><span>{selected ? <Check size={15} /> : '0' + (planes.indexOf(plane) + 1)}</span></div>
            <div className="plane-card-info"><span className="eyebrow">{t.planeRoles[plane.id]}</span><h3>{t.planeNames[plane.id]}</h3><p>{t.planeTraits[plane.id]}</p><div className="plane-stats"><span>{t.hp} <b>{Math.round(plane.maxHealth * hpScale)}</b></span><span>{t.speed} <b>{plane.speed.toFixed(1)}</b></span><span>{t.fireRate} <b>{(1000 / plane.fireRate).toFixed(1)}</b></span></div></div>
          </button>;
        })}
      </div></div>
      <div className="modal-footer"><span>SELECT 03 AIRCRAFT / DEPLOY</span><button className="secondary-button" onClick={onClose}>{t.backHome}</button></div>
    </div>
  </div>
);
