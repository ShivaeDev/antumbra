import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { VoyageWorldSource, VoyageWorldSourceLive } from "#voyage-world.ts";

const it = persistenceIt();

it.effectDB(
	"owns the aggregate read and preserves voyage birth order",
	function* (db) {
		yield* db.Voyage.create({
			backend: "scripted",
			context: "charted second",
			createdAt: new Date("2026-08-17T02:00:00.000Z"),
			focusedAt: null,
			id: "newer-voyage",
			name: "Newer",
			northStar: "second",
		});
		yield* db.Voyage.create({
			backend: "scripted",
			context: "charted first",
			createdAt: new Date("2026-08-17T01:00:00.000Z"),
			focusedAt: null,
			id: "older-voyage",
			name: "Older",
			northStar: "first",
		});

		yield* Effect.gen(function* () {
			const source = yield* VoyageWorldSource;
			const world = yield* source.read;
			expect(world.voyages.map((voyage) => voyage.id)).toEqual([
				"older-voyage",
				"newer-voyage",
			]);
		}).pipe(Effect.provide(VoyageWorldSourceLive));
	},
);
