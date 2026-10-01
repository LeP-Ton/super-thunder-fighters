import React from 'react';
import { ArrowUpRight, Crosshair, Info, Play, Settings2 } from 'lucide-react';
import { Translation } from '../i18n';
import { Briefing } from '../services/geminiService';
import { shipAssets } from '../render/ships';

interface StartOverlayProps {
  t: Translation;
  briefing: Briefing | null;
  canStart: boolean;
  onStart: () => void;
  onShowIntel: () => void;
  onShowHangar: () => void;
  onShowSettings: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ t, briefing, canStart, onStart, onShowIntel, onShowHangar, onShowSettings }) => (
  <div className="screen-overlay start-overlay">
    <div className="start-topline"><span>ORBITAL FRONT // SECTOR 07</span><span>FLIGHT STATUS / READY</span></div>
    <div className="start-hero">
      <div className="hero-aura" />
      <img src={shipAssets.vanguard} alt="" />
      <div className="hero-label">VANGUARD / 001</div>
    </div>
    <div className="start-content">
      <div className="eyebrow"><span className="live-indicator" /> FLIGHT CLEARANCE GRANTED</div>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      <div className="briefing-card">
        <div className="briefing-heading"><span>{t.briefingTitle}</span><ArrowUpRight size={15} /></div>
        <strong>{briefing?.title ?? 'MISSION BRIEFING'}</strong>
        <p>{briefing?.tacticalAdvice ?? t.combatAdviceLabel}</p>
      </div>
      <button className="primary-button" onClick={onStart} disabled={!canStart}><Play size={18} fill="currentColor" />{t.initiate}<ArrowUpRight size={18} /></button>
      <div className="quick-actions">
        <button onClick={onShowHangar}><Crosshair size={17} />{t.hangarTitle}</button>
        <button onClick={onShowIntel}><Info size={17} />{t.intel}</button>
        <button onClick={onShowSettings}><Settings2 size={17} />{t.settings}</button>
      </div>
    </div>
  </div>
);
