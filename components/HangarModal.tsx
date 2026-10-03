import React, { useState } from "react";
import { Check, Plus, Minus, X, MoveHorizontal } from "lucide-react";
import { GameStatus, PlaneDef, PlaneId } from "../types";
import { Translation } from "../i18n";
import { modelPreviews } from "../render/modelManifest";
import { ShipShowcase } from "./ShipShowcase";
import { PresentationCopy } from "./presentationCopy";

interface HangarModalProps {
  t: Translation;
  copy: PresentationCopy;
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
  copy,
  planes,
  selectedPlanes,
  status,
  hpScale,
  onTogglePlane,
  onClose,
}) => {
  const [focused, setFocused] = useState<PlaneId>(
    selectedPlanes[0] || "vanguard",
  );
  const plane = planes.find((item) => item.id === focused)!;
  const selected = selectedPlanes.includes(focused);
  const full = !selected && selectedPlanes.length >= 3;
  return (
    <div
      className="screen-overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hangar-title"
    >
      <div className="modal-panel hangar-panel">
        <div className="modal-header">
          <div>
            <span className="eyebrow">FLEET / 01 — 06</span>
            <h2 id="hangar-title">{t.hangarTitle}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t.backHome}
          >
            <X size={22} />
          </button>
        </div>
        <div className="hangar-workspace">
          <div className="aircraft-inspection">
            <div className="inspection-heading">
              <span className="eyebrow">ST — 0{planes.indexOf(plane) + 1}</span>
              <h3>{t.planeNames[focused]}</h3>
              <p>{t.planeRoles[focused]}</p>
            </div>
            <ShipShowcase
              key={focused}
              kind={focused}
              label={t.planeNames[focused]}
            />
            <span className="rotate-hint">
              <MoveHorizontal size={15} />
              {copy.rotate}
            </span>
          </div>
          <div className="hangar-configuration">
            <div className="section-heading">
              <span>{copy.loadout}</span>
              <strong>{selectedPlanes.length} / 3</strong>
            </div>
            <div className="plane-grid">
              {planes.map((item, index) => (
                <button
                  key={item.id}
                  className={
                    "plane-card " +
                    (focused === item.id ? "focused " : "") +
                    (selectedPlanes.includes(item.id) ? "selected" : "")
                  }
                  onClick={() => setFocused(item.id)}
                  aria-pressed={focused === item.id}
                >
                  <div className="plane-card-art">
                    <img src={modelPreviews[item.id]} alt="" />
                    <span>
                      {selectedPlanes.includes(item.id) ? (
                        <Check size={12} />
                      ) : (
                        `0${index + 1}`
                      )}
                    </span>
                  </div>
                  <strong>{t.planeNames[item.id]}</strong>
                </button>
              ))}
            </div>
            <div className="specification">
              <span className="eyebrow">{copy.specification}</span>
              <p>{t.planeTraits[focused]}</p>
              {[
                {
                  name: t.hp,
                  value: Math.round(plane.maxHealth * hpScale),
                  percent: plane.maxHealth / 180,
                },
                {
                  name: t.speed,
                  value: plane.speed.toFixed(1),
                  percent: plane.speed / 9,
                },
                {
                  name: t.fireRate,
                  value: (1000 / plane.fireRate).toFixed(1),
                  percent: 100 / plane.fireRate,
                },
              ].map((stat) => (
                <div className="stat-row" key={stat.name}>
                  <span>{stat.name}</span>
                  <div>
                    <i
                      style={{ width: `${Math.min(100, stat.percent * 100)}%` }}
                    />
                  </div>
                  <b>{stat.value}</b>
                </div>
              ))}
            </div>
            <button
              className={
                "primary-button assignment-button " +
                (selected ? "is-assigned" : "")
              }
              disabled={status !== GameStatus.START || full}
              onClick={() => onTogglePlane(focused)}
            >
              {selected ? <Minus size={17} /> : <Plus size={17} />}
              {selected ? copy.remove : copy.assign}
            </button>
            <p className="selection-hint">{t.hangarHint}</p>
          </div>
        </div>
        <div className="modal-footer">
          <span>
            {t.hangarCount.replace("{count}", String(selectedPlanes.length))}
          </span>
          <button className="secondary-button" onClick={onClose}>
            {t.backHome}
          </button>
        </div>
      </div>
    </div>
  );
};
