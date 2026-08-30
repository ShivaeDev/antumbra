import { withAppHarness } from "#app-harness.ts";
import { makeEffectIt } from "#effect-it.ts";

export const it = makeEffectIt(withAppHarness);
