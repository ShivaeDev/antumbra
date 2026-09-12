import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";

const blocked = {
	backend: "codex",
	status: "blocked",
	reason: "usage-limit",
	detail: "Quota reached",
	observedAt: 0,
	resetsAt: 1,
	utilization: 1,
} as const;

it.app("keeps a provider blocked until explicit retry", function* (app) {
	yield* app.api.backends.listModels({ backend: "codex", models: [], failure: null });
	yield* app.api.capacity.observe(blocked);
	yield* app.clock.advance(100);
	yield* app.api.capacity.observe({ ...blocked, status: "available", observedAt: 10 });
	yield* app.api.capacity.observe({ ...blocked, status: "warning", observedAt: 20 });
	expect(yield* answered(app.api.capacity.providers({}))).toEqual([blocked]);
	yield* app.api.capacity.release({ backend: "codex" });
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([
		{ backend: "codex", status: "available", reason: null, detail: null, resetsAt: null, utilization: null },
	]);
	yield* app.api.capacity.observe(blocked);
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([{ status: "available" }]);
	yield* app.api.capacity.observe({ ...blocked, observedAt: 101 });
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([{ status: "blocked", observedAt: 101 }]);
});

it.app("preserves newer provider evidence when retry is older", function* (app) {
	yield* app.api.backends.listModels({ backend: "codex", models: [], failure: null });
	yield* app.api.capacity.observe({ ...blocked, observedAt: 100 });
	yield* app.api.capacity.release({ backend: "codex" });
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([{ status: "blocked", observedAt: 100 }]);
});

it.app("orders observations by time and then severity", function* (app) {
	yield* app.api.capacity.observe({ ...blocked, status: "warning", observedAt: 100 });
	yield* app.api.capacity.observe({ ...blocked, observedAt: 99 });
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([{ status: "warning", observedAt: 100 }]);
	yield* app.api.capacity.observe({ ...blocked, observedAt: 100 });
	yield* app.api.capacity.observe({ ...blocked, status: "warning", observedAt: 100 });
	expect(yield* answered(app.api.capacity.providers({}))).toMatchObject([{ status: "blocked", observedAt: 100 }]);
});
