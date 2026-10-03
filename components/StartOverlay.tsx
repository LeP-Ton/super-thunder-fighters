import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Crosshair,
} from "lucide-react";
import { Translation } from "../i18n";
import { PlaneId } from "../types";
import { modelPreviews } from "../render/modelManifest";
import { ShipShowcase } from "./ShipShowcase";
import { PresentationCopy } from "./presentationCopy";

interface StartOverlayProps {
  t: Translation;
  copy: PresentationCopy;
  selectedPlanes: PlaneId[];
  canStart: boolean;
  obscured: boolean;
  onStart: () => void;
  onShowIntel: () => void;
  onShowHangar: () => void;
  onShowSettings: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({
  t,
  copy,
  selectedPlanes,
  canStart,
  obscured,
  onStart,
  onShowIntel,
  onShowHangar,
  onShowSettings,
}) => {
  const [featured, setFeatured] = useState<PlaneId>("vanguard");
  return (
    <section className="start-overlay">
      <div className="hangar-backdrop" />
      <div className="hero-model">
        <ShipShowcase
          home
          kind={featured}
          label={t.planeNames[featured]}
          paused={obscured}
          interactive={false}
        />
      </div>
      <div className="hero-copy">
        <div className="operation-label">
          <span />
          {copy.operation}
        </div>
        <h1>{t.title}</h1>
        <p className="hero-description">{copy.description}</p>
        <button
          className="primary-button launch-button"
          onClick={onStart}
          disabled={!canStart}
        >
          <span>{t.initiate}</span>
          <ArrowUpRight size={23} />
        </button>
        <button className="hero-intel" onClick={onShowIntel}>
          <Crosshair size={15} />
          {t.intel}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="hero-aircraft-label">
        <span>ST / {featured.toUpperCase()}</span>
        <h2>{t.planeNames[featured]}</h2>
        <p>{t.planeRoles[featured]}</p>
      </div>
      <div className="home-bottom">
        <div className="formation-heading">
          <span>
            {copy.loadout}
            <b>{String(selectedPlanes.length).padStart(2, "0")} / 03</b>
          </span>
          <button onClick={onShowHangar}>
            {t.hangarTitle}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="formation-slots">
          {Array.from({ length: 3 }, (_, i) => {
            const id = selectedPlanes[i];
            return (
              <button
                key={i}
                className={
                  "formation-card " + (id === featured ? "active" : "")
                }
                onClick={() => (id ? setFeatured(id) : onShowHangar())}
              >
                <span className="formation-index">0{i + 1}</span>
                {id && <img src={modelPreviews[id]} alt="" />}
                <div>
                  <strong>{id ? t.planeNames[id] : "+"}</strong>
                  <small>{id ? t.planeRoles[id] : t.hangarHint}</small>
                </div>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="home-location">
        <span className="live-indicator" />
        {copy.location}
        <small>35° 41′ N / 139° 41′ E</small>
      </div>
      <div className="quick-actions sr-only">
        <button onClick={onShowHangar}>{t.hangarTitle}</button>
        <button onClick={onShowIntel}>{t.intel}</button>
        <button onClick={onShowSettings}>{t.settings}</button>
      </div>
    </section>
  );
};
