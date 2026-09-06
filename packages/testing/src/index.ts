import { makeEffectApp } from "@antumbra/testing-runtime";
import { makeTestApp } from "#make-test-app.ts";

export const it = { effectApp: makeEffectApp(makeTestApp) };

export { endsTurn } from "@antumbra/testing-runtime";
export { makeTestApp } from "#make-test-app.ts";
