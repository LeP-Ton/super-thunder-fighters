import React, { useState } from "react";
import { X, MoveHorizontal } from "lucide-react";
import { Translation } from "../i18n";
import { EnemySubType } from "../types";
import { modelPreviews } from "../render/modelManifest";
import { ShipShowcase } from "./ShipShowcase";
import { PresentationCopy } from "./presentationCopy";

export const IntelModal: React.FC<{
  t: Translation;
  copy: PresentationCopy;
  onClose: () => void;
}> = ({ t, copy, onClose }) => {
  const units: Array<{ id: EnemySubType; name: string; desc: string }> = [
    { id: "grunt", name: t.swarm, desc: t.swarmDesc },
    { id: "kamikaze", name: t.kamikaze, desc: t.kamikazeDesc },
    { id: "elite", name: t.elite, desc: t.eliteDesc },
    { id: "super", name: t.super, desc: t.superDesc },
  ];
  const [index, setIndex] = useState(0);
  const unit = units[index];
  return (
    <div
      className="screen-overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intel-title"
    >
      <div className="modal-panel intel-panel">
        <div className="modal-header">
          <div>
            <span className="eyebrow">INTELLIGENCE / RESTRICTED</span>
            <h2 id="intel-title">{t.intelTitle}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t.backHome}
          >
            <X size={22} />
          </button>
        </div>
        <div className="intel-workspace">
          <div className="aircraft-inspection hostile-inspection">
            <div className="inspection-heading">
              <span className="eyebrow">HOSTILE — 0{index + 1}</span>
              <h3>{unit.name}</h3>
            </div>
            <ShipShowcase kind={unit.id} label={unit.name} />
            <span className="rotate-hint">
              <MoveHorizontal size={15} />
              {copy.rotate}
            </span>
          </div>
          <div className="intel-details">
            <span className="eyebrow">{copy.threat}</span>
            <div className="threat-level">
              0{index + 1}
              <span>
                {Array.from({ length: 4 }, (_, i) => (
                  <i key={i} className={i <= index ? "active" : ""} />
                ))}
              </span>
            </div>
            <h3>{unit.name}</h3>
            <p>{unit.desc}</p>
            <div className="enemy-list">
              {units.map((enemy, i) => (
                <button
                  className={"enemy-card " + (i === index ? "active" : "")}
                  key={enemy.id}
                  onClick={() => setIndex(i)}
                >
                  <div className="enemy-art">
                    <img src={modelPreviews[enemy.id]} alt="" />
                  </div>
                  <strong>{enemy.name}</strong>
                  <span>0{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <span>{t.enemyFleetTitle}</span>
          <button className="secondary-button" onClick={onClose}>
            {t.backHome}
          </button>
        </div>
      </div>
    </div>
  );
};
