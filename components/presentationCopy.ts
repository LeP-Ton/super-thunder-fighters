import { Language } from "../i18n";

export const presentationCopy: Record<
  Language,
  {
    division: string;
    operation: string;
    location: string;
    description: string;
    loadout: string;
    inspect: string;
    assigned: string;
    assign: string;
    remove: string;
    rotate: string;
    loading: string;
    ready: string;
    specification: string;
    threat: string;
  }
> = {
  zh: {
    division: "轨道防卫司令部",
    operation: "行动 07 / 破晓",
    location: "开普勒 · 低轨战区",
    description: "云海之上，防线之外。\n驾驶你的战机，夺回这片天空。",
    loadout: "出击编队",
    inspect: "检视战机",
    assigned: "已编入",
    assign: "加入编队",
    remove: "移出编队",
    rotate: "拖动旋转 · 检视机体",
    loading: "机库准备中",
    ready: "系统就绪",
    specification: "机体性能",
    threat: "威胁等级",
  },
  en: {
    division: "ORBITAL DEFENSE COMMAND",
    operation: "OPERATION 07 / DAYBREAK",
    location: "KEPLER · LOW ORBIT",
    description:
      "Above the clouds. Beyond the line.\nTake your fighter. Reclaim the sky.",
    loadout: "FLIGHT FORMATION",
    inspect: "INSPECT FIGHTER",
    assigned: "ASSIGNED",
    assign: "ASSIGN TO FLIGHT",
    remove: "REMOVE FROM FLIGHT",
    rotate: "DRAG TO ROTATE · INSPECT",
    loading: "PREPARING HANGAR",
    ready: "SYSTEMS READY",
    specification: "AIRCRAFT PERFORMANCE",
    threat: "THREAT LEVEL",
  },
  ja: {
    division: "軌道防衛司令部",
    operation: "作戦 07 / 夜明け",
    location: "ケプラー · 低軌道戦域",
    description: "雲海を越え、防衛線の先へ。\n戦闘機を駆り、この空を取り戻せ。",
    loadout: "出撃編隊",
    inspect: "機体を確認",
    assigned: "配備済み",
    assign: "編隊に追加",
    remove: "編隊から外す",
    rotate: "ドラッグで回転 · 機体確認",
    loading: "格納庫準備中",
    ready: "システム準備完了",
    specification: "機体性能",
    threat: "脅威レベル",
  },
  ko: {
    division: "궤도 방위 사령부",
    operation: "작전 07 / 새벽",
    location: "케플러 · 저궤도 전장",
    description: "구름 위, 방어선 너머.\n전투기에 올라 하늘을 되찾으세요.",
    loadout: "출격 편대",
    inspect: "기체 확인",
    assigned: "배치 완료",
    assign: "편대에 추가",
    remove: "편대에서 제외",
    rotate: "드래그로 회전 · 기체 확인",
    loading: "격납고 준비 중",
    ready: "시스템 준비 완료",
    specification: "기체 성능",
    threat: "위협 수준",
  },
  ru: {
    division: "ОРБИТАЛЬНАЯ ОБОРОНА",
    operation: "ОПЕРАЦИЯ 07 / РАССВЕТ",
    location: "КЕПЛЕР · НИЗКАЯ ОРБИТА",
    description:
      "Выше облаков. За линией обороны.\nПоднимите истребитель. Верните небо.",
    loadout: "БОЕВОЙ СОСТАВ",
    inspect: "ОСМОТР САМОЛЁТА",
    assigned: "В СОСТАВЕ",
    assign: "ДОБАВИТЬ В ЗВЕНО",
    remove: "УБРАТЬ ИЗ ЗВЕНА",
    rotate: "ПЕРЕТАЩИТЕ ДЛЯ ОБЗОРА",
    loading: "ПОДГОТОВКА АНГАРА",
    ready: "СИСТЕМЫ ГОТОВЫ",
    specification: "ХАРАКТЕРИСТИКИ",
    threat: "УРОВЕНЬ УГРОЗЫ",
  },
};
export type PresentationCopy = typeof presentationCopy.zh;
