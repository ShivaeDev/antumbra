import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber } from "effect";
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
postgresApp.it(
	"replays capacity and preserves newer evidence across concurrent release",
	[],
	function* ({ journal, replayJournal, api, clock, holdWrite, rollback, published, clearPublished, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.backends.listModels({ backend: "codex", models: [], failure: null });
		yield* legacy.api.capacity.observe(blocked);
		yield* replayJournal(legacy);
		expect(yield* api["capacity.providers"]({})).toEqual(yield* answered(legacy.api.capacity.providers({}), "journal capacity"));
		yield* clock.advance(100);
		yield* clearPublished();
		const held = yield* holdWrite(api["capacity.release"]({ requestId: Request.make("release"), backend: "codex" }));
		const newer = yield* api["capacity.observe"]({ requestId: Request.make("newer"), ...blocked, observedAt: 101 }).pipe(Effect.forkScoped);
		expect(yield* held.blocked()).not.toHaveLength(0);
		expect(yield* api["capacity.providers"]({})).toEqual([blocked]);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		yield* Fiber.join(newer);
		expect(yield* api["capacity.providers"]({})).toEqual([{ ...blocked, observedAt: 101 }]);
		yield* clock.advance(100);
		yield* clearPublished();
		yield* rollback(api["capacity.release"]({ requestId: Request.make("rollback"), backend: "codex" }));
		expect(yield* api["capacity.providers"]({})).toEqual([{ ...blocked, observedAt: 101 }]);
		expect(yield* published()).toEqual([]);
		expect(yield* Effect.flip(api["capacity.release"]({ requestId: Request.make("missing"), backend: "claude" }))).toMatchObject({
			_tag: "UnknownBackend",
		});
		yield* rebuild();
		expect(yield* api["capacity.providers"]({})).toEqual([{ ...blocked, observedAt: 101 }]);
	},
);
