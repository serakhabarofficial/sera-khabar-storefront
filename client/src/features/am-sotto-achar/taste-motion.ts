export type TasteMotionState = { progress: number; first: number; second: number };
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => { const n = clamp(value); return n * n * (3 - 2 * n); };

export function createTasteMotionState(progress: number): TasteMotionState {
  return { progress, first: smoothstep((progress - 0.25) / 0.16), second: smoothstep((progress - 0.6) / 0.16) };
}

export function advanceTasteMotion(state: TasteMotionState, target: number, elapsedMs: number): TasteMotionState {
  const dt = Math.min(64, Math.max(0, elapsedMs));
  const progress = state.progress + (target - state.progress) * (1 - Math.exp(-dt / 80));
  const goal = createTasteMotionState(target);
  // Ease the visual phases, not just the scroll position. Passing a narrow scroll
  // window in one wheel event must not compress an entire image swap into one frame.
  const blend = 1 - Math.exp(-dt / 120);
  const follow = (current: number, end: number) => Math.abs(end - current) < 1e-4 ? end : current + (end - current) * blend;
  return {
    progress: Math.abs(target - progress) < 1e-4 ? target : progress,
    first: follow(state.first, goal.first),
    second: follow(state.second, goal.second),
  };
}

export function tasteMotionVisuals(state: TasteMotionState) {
  const swap = state.first * (1 - state.second);
  return { position: state.first + state.second, swap, dip: 4 * swap * (1 - swap) };
}
