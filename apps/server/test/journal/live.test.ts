import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { counts } from "@antumbra/domain-settings/queries/counts.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { it } from "#testing/entry.ts";

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

it.app("live queries coalesce commits and publish the final value", function* (app) {
	const live = yield* app.live(counts, {});
	yield* app.settle();
	const before = (yield* live.seen).length;
	const changes = yield* Effect.forEach(
		[9, 10, 11, 12, 13],
		(count) => Effect.map(app.commit.settings.setCount({ key: "maxParallelSessions", count }), (seq) => ({ count, seq })),
		{ concurrency: "unbounded" },
	);
	yield* app.settle();
	const seen = yield* live.seen;
	const last = changes.toSorted((left, right) => right.seq - left.seq)[0];
	expect(seen.length - before).toBeLessThan(changes.length);
	expect(seen.at(-1)).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: last?.count }));
});
