import React from 'react';
import { X } from 'lucide-react';
import { Translation } from '../i18n';
import { EnemySubType } from '../types';
import { shipAssets } from '../render/ships';

interface IntelModalProps {
  t: Translation;
  onClose: () => void;
}

export const IntelModal: React.FC<IntelModalProps> = ({ t, onClose }) => {
  const units: Array<{ id: EnemySubType; name: string; desc: string; threat: string }> = [
    { id: 'grunt', name: t.swarm, desc: t.swarmDesc, threat: '01' },
    { id: 'kamikaze', name: t.kamikaze, desc: t.kamikazeDesc, threat: '02' },
    { id: 'elite', name: t.elite, desc: t.eliteDesc, threat: '03' },
    { id: 'super', name: t.super, desc: t.superDesc, threat: '04' }
  ];
  return <div className="screen-overlay modal-overlay">
    <div className="modal-panel">
      <div className="modal-header"><div><span className="eyebrow">ENEMY GALLERY / 04</span><h2>{t.intelTitle}</h2></div><button className="icon-button" onClick={onClose} aria-label={t.backHome}><X size={20} /></button></div>
      <div className="modal-intro"><p>{t.enemyFleetTitle}</p><strong>HOSTILE CONTACTS</strong></div>
      <div className="modal-scroll enemy-list">{units.map((unit) => <div className={'enemy-card enemy-' + unit.id} key={unit.id}>
        <div className="enemy-art"><img src={shipAssets[unit.id]} alt="" /></div>
        <div><span className="eyebrow">THREAT CLASS {unit.threat}</span><h3>{unit.name}</h3><p>{unit.desc}</p></div>
      </div>)}</div>
      <div className="modal-footer"><span>INTELLIGENCE VERIFIED</span><button className="secondary-button" onClick={onClose}>{t.backHome}</button></div>
    </div>
  </div>;
};
