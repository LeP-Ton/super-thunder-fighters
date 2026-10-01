import React from 'react';
import { Activity, Shield, Zap } from 'lucide-react';
import { Difficulty } from '../types';
import { ENERGY_MAX } from '../planes';
import { Translation } from '../i18n';

interface HudBarProps {
  score: number;
  level: number;
  health: number;
  maxHealth: number;
  energy: number;
  difficulty: Difficulty;
  t: Translation;
}

export const HudBar: React.FC<HudBarProps> = ({ score, level, health, maxHealth, energy, difficulty, t }) => (
  <div className="hud-bar">
    <div className="hud-block"><span className="hud-label"><Activity size={13} />{t.score}</span><strong>{score.toString().padStart(6, '0')}</strong></div>
    <div className="hud-block hud-level"><span className="hud-label">{t.level}</span><strong>{String(level).padStart(2, '0')}</strong></div>
    <div className="hud-vitals">
      <div className="vital-title"><span><Shield size={13} />{t.integrity}</span><strong>{Math.ceil(health)} / {maxHealth}</strong></div>
      <div className="vital-track"><div className={health / maxHealth < 0.3 ? 'vital-fill critical' : 'vital-fill'} style={{ width: String(Math.max(0, health / maxHealth * 100)) + '%' }} /></div>
      <div className="energy-row"><span><Zap size={12} />{t.energy}</span><div className="energy-cells">{Array.from({ length: ENERGY_MAX }, (_, i) => <i key={i} className={energy > i ? 'charged' : ''} />)}</div><b>{t[difficulty]}</b></div>
    </div>
  </div>
);
