import { type AppHarness, runWithApp } from "#app.ts";
import { makeEffectApp } from "#it.ts";

export const it = { effectApp: makeEffectApp<AppHarness, never>(runWithApp) };
