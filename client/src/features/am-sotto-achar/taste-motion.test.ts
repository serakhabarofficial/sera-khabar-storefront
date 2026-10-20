import assert from "node:assert/strict";
import test from "node:test";
import { advanceTasteMotion, createTasteMotionState, tasteMotionVisuals } from "./taste-motion";

test("taste landmarks retain the approved bowl and text states", () => {
  assert.deepEqual(tasteMotionVisuals(createTasteMotionState(0.12)), { position: 0, swap: 0, dip: 0 });
  assert.deepEqual(tasteMotionVisuals(createTasteMotionState(0.5)), { position: 1, swap: 1, dip: 0 });
  assert.deepEqual(tasteMotionVisuals(createTasteMotionState(0.88)), { position: 2, swap: 0, dip: 0 });
});

test("a large wheel step cannot snap the bowl into its next pose in one frame", () => {
  let state = createTasteMotionState(0);
  let previous = tasteMotionVisuals(state);
  for (let frame = 0; frame < 90; frame++) {
    state = advanceTasteMotion(state, 0.88, 1000 / 60);
    const current = tasteMotionVisuals(state);
    assert.ok(Math.abs(current.swap - previous.swap) < 0.16, `image opacity jumped ${previous.swap} → ${current.swap} at frame ${frame}`);
    assert.ok(Math.abs(current.dip - previous.dip) * 0.08 < 0.04, `bowl size snapped at frame ${frame}`);
    previous = current;
  }
});

test("the first bowl change stays smooth and settles even after scrolling stops", () => {
  let state = createTasteMotionState(0);
  let intermediateFrames = 0;
  for (let frame = 0; frame < 90; frame++) {
    state = advanceTasteMotion(state, 0.5, 1000 / 60);
    const { swap } = tasteMotionVisuals(state);
    if (swap > 0.02 && swap < 0.98) intermediateFrames++;
  }
  assert.ok(intermediateFrames >= 12, `only ${intermediateFrames} frames bridge the two bowl images`);
  assert.ok(tasteMotionVisuals(state).swap > 0.999);
});

test("reversing a scroll retargets from the visible bowl rather than resetting", () => {
  let state = createTasteMotionState(0.5);
  for (let frame = 0; frame < 12; frame++) state = advanceTasteMotion(state, 0.88, 1000 / 60);
  const before = tasteMotionVisuals(state);
  state = advanceTasteMotion(state, 0.12, 1000 / 60);
  assert.ok(Math.abs(tasteMotionVisuals(state).swap - before.swap) < 0.16);
  for (let frame = 0; frame < 90; frame++) state = advanceTasteMotion(state, 0.12, 1000 / 60);
  assert.ok(tasteMotionVisuals(state).swap < 0.001);
});
