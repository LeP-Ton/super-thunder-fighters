import * as THREE from "three";
import { ShipAsset } from "./modelLibrary";
import { ShipKind } from "./modelManifest";
import { createParkedDisplay } from "./parkedDisplay";

export type TransferPhase =
  | "empty"
  | "parked"
  | "aligning"
  | "departing"
  | "arriving";
type PreparedShip = { kind: ShipKind; asset: ShipAsset };
const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** 展示专用交接状态机：加载成功后才离场，飞行与滑行使用同一机位坐标。 */
export class HangarTransfer {
  readonly group = new THREE.Group();
  phase: TransferPhase = "empty";
  currentKind?: ShipKind;
  requestedKind?: ShipKind;
  private display?: ReturnType<typeof createParkedDisplay>;
  private prepared?: PreparedShip;
  private time = 0;
  private alignFrom = 0;
  private rotationTarget = 0;

  constructor(private readonly onChange: () => void) {}

  get busy() {
    return this.phase !== "parked" && this.phase !== "empty";
  }
  get ready() {
    return this.phase === "parked" && this.currentKind === this.requestedKind;
  }

  request(kind: ShipKind) {
    this.requestedKind = kind;
    if (kind === this.currentKind && this.phase !== "departing") {
      this.prepared = undefined;
      if (this.phase === "aligning") {
        this.display?.setFlightState(0, 0);
        this.setPhase("parked");
      }
    }
    this.onChange();
  }

  prepare(kind: ShipKind, asset: ShipAsset, immediate = false) {
    if (kind !== this.requestedKind) return;
    if (!this.display || immediate) {
      this.replace({ kind, asset });
      this.prepared = undefined;
      this.setPhase("parked");
    } else if (kind !== this.currentKind || this.phase === "departing") {
      this.prepared = { kind, asset };
      if (this.phase === "parked") this.beginDeparture();
    }
    this.onChange();
  }

  rotateBy(angle: number) {
    if (this.ready) this.rotationTarget += angle;
  }

  finishImmediately() {
    if (this.prepared) this.replace(this.prepared);
    this.prepared = undefined;
    if (this.display) {
      this.display.aircraft.position.set(0, 0, 0);
      this.display.aircraft.rotation.set(0, 0, 0);
      this.display.markings.rotation.y = 0;
      this.display.setFlightState(0, 0);
      this.group.rotation.y = this.rotationTarget = 0;
      this.setPhase("parked");
    }
  }

  private setPhase(phase: TransferPhase) {
    this.phase = phase;
    this.time = 0;
    this.onChange();
  }

  private replace(next: PreparedShip) {
    if (this.display) {
      this.group.remove(this.display.aircraft, this.display.markings);
      this.display.dispose();
    }
    this.display = createParkedDisplay(next.asset);
    this.currentKind = next.kind;
    this.group.add(this.display.aircraft, this.display.markings);
    this.group.rotation.y = this.rotationTarget = 0;
  }

  private beginDeparture() {
    // 检视可以累积多圈，起飞前只走最短角度回正，不倒转多圈。
    this.alignFrom = Math.atan2(
      Math.sin(this.group.rotation.y),
      Math.cos(this.group.rotation.y),
    );
    this.group.rotation.y = this.alignFrom;
    this.rotationTarget = 0;
    this.setPhase("aligning");
  }

  update(delta: number) {
    if (!this.display) return false;
    const aircraft = this.display.aircraft;
    if (this.phase === "parked") {
      const difference = this.rotationTarget - this.group.rotation.y;
      if (Math.abs(difference) < 0.0001) return false;
      this.group.rotation.y += difference * (1 - Math.exp(-12 * delta));
      // 标线留在地面原方位，检视只转动机体。
      this.display.markings.rotation.y = -this.group.rotation.y;
      return true;
    }
    this.time += delta;
    if (this.phase === "aligning") {
      this.group.rotation.y = this.alignFrom * (1 - smooth(this.time / 0.55));
      this.display.markings.rotation.y = -this.group.rotation.y;
      this.display.setFlightState(0, smooth(this.time / 0.55) * 0.28);
      if (this.time >= 0.55) this.setPhase("departing");
    } else if (this.phase === "departing") {
      const t = Math.min(this.time / 2.8, 1);
      // 舱内低空直行；通过 z=-28 的舱口后才拉升，避免穿过门框和顶棚。
      aircraft.position.z = -140 * t * t;
      aircraft.position.y =
        1.65 * smooth(t / 0.44) + 32 * smooth((t - 0.58) / 0.42);
      aircraft.rotation.x =
        0.055 * smooth(t / 0.4) + 0.15 * smooth((t - 0.6) / 0.4);
      this.display.setFlightState(
        smooth((t - 0.14) / 0.32),
        0.28 + 0.72 * smooth(t / 0.5),
      );
      if (t === 1 && this.prepared) {
        const next = this.prepared;
        this.prepared = undefined;
        this.replace(next);
        this.display.aircraft.position.z = 32;
        this.setPhase("arriving");
      }
    } else if (this.phase === "arriving") {
      const t = Math.min(this.time / 2.7, 1);
      aircraft.position.z = 32 * (1 - t) ** 3;
      // 轮胎始终保持 y=0；减速滑入后完全停稳，再接受检视和下一次交接。
      aircraft.position.y = 0;
      this.display.setFlightState(0, 0);
      if (t === 1) {
        this.setPhase("parked");
        if (this.prepared && this.prepared.kind !== this.currentKind)
          this.beginDeparture();
      }
    }
    return true;
  }

  snapshot() {
    return {
      phase: this.phase,
      currentKind: this.currentKind,
      requestedKind: this.requestedKind,
      position: this.display?.aircraft.position.toArray(),
      rotation: this.group.rotation.y,
      ready: this.ready,
    };
  }

  dispose() {
    this.display?.dispose();
    this.display = undefined;
    this.prepared = undefined;
    this.group.clear();
  }
}
