export const FIXED_STEP_MS = 1000 / 60;
const MAX_ELAPSED_MS = 100;

export interface FixedClock {
  lastFrameTime: number | null;
  simulationTime: number;
  remainder: number;
}

export const createFixedClock = (): FixedClock => ({
  lastFrameTime: null,
  simulationTime: 0,
  remainder: 0
});

export const advanceFixedClock = (
  clock: FixedClock,
  frameTime: number,
  update: (time: number) => boolean
) => {
  if (clock.lastFrameTime === null) {
    clock.lastFrameTime = frameTime;
    clock.simulationTime = frameTime;
    return { updated: false, shouldContinue: true };
  }

  // 切回页面后限制补帧量，避免长时间后台停顿导致集中运算。
  const elapsed = Math.min(MAX_ELAPSED_MS, Math.max(0, frameTime - clock.lastFrameTime));
  clock.lastFrameTime = frameTime;
  clock.remainder += elapsed;

  let updated = false;
  while (clock.remainder + 0.0001 >= FIXED_STEP_MS) {
    clock.remainder -= FIXED_STEP_MS;
    clock.simulationTime += FIXED_STEP_MS;
    updated = true;
    if (!update(clock.simulationTime)) return { updated, shouldContinue: false };
  }

  return { updated, shouldContinue: true };
};
