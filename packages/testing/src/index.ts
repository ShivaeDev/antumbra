// why: tests import this `it` rather than `@effect/vitest`, so the dispatching
// kernel, scripted ports, TestClock, and throwaway database are already under
// them. Production source is fenced from this package.
export { it } from "#app-it.ts";
export {
	dispatchingLayer,
	domainKernelLayer,
	watchingLayer,
} from "#domain-layers.ts";
export {
	makeScriptedBackend,
	rawOf,
	type ScriptedBackend,
	type ScriptedSession,
} from "#scripted-backend.ts";
export {
	changeHostsOf,
	makeScriptedRunner,
	passiveRunner,
	type ScriptedRunner,
} from "#scripted-runner.ts";
