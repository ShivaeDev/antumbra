import { it } from "@antumbra/app-testing/entry.ts";
import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { Effect, Latch } from "effect";
import { expect } from "vitest";

it.app("live queries refresh only for their scope", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: "voyage-1" });
	yield* app.settle();
	const before = yield* live.seen;
	expect(before).toHaveLength(1);
	yield* app.api.roleSettings.choose({ scope: "voyage-2", role: "crew", backend: null, model: "elsewhere", effort: null });
	yield* app.settle();
	expect(yield* live.seen).toEqual(before);
	yield* app.api.roleSettings.choose({ scope: "voyage-1", role: "crew", backend: null, model: "chosen", effort: null });
	yield* app.settle();
	expect((yield* live.seen).at(-1)).toContainEqual(expect.objectContaining({ role: "crew", model: "chosen" }));
});

it.app("coalesces commits while a query is reading", function* (app) {
	const reading = yield* Latch.make(false);
	const release = yield* Latch.make(false);
	const held: typeof counts = {
		...counts,
		run: (input, rows) =>
			Effect.gen(function* () {
				yield* reading.open;
				yield* release.await;
				return yield* counts.run(input, rows);
			}),
	};
	const live = yield* app.live(held, {});
	yield* reading.await;
	for (const count of [9, 10, 11, 12, 13]) {
		yield* app.commit.settings.setCount({ key: "maxParallelSessions", count });
	}
	yield* release.open;
	yield* app.settle();
	const seen = yield* live.seen;
	expect(seen).toHaveLength(2);
	expect(seen.at(-1)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 13 }));
});
