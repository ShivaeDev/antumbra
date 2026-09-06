import { Effect } from "effect";
import { expect } from "vitest";
import { byVoyage } from "#example/queries/by-voyage.ts";
import { elsewhere, it, launched, pieceId, voyage } from "#test/kit.ts";

const sweep = [1, 2, 3, 4, 5];

it.app("a live query emits the rows it watches and emits again when its scope is dirtied", function* (app) {
	yield* app.seed.piece(launched(1));
	const live = yield* app.live(byVoyage, { voyageId: voyage });
	yield* app.settle();
	expect(yield* live.seen).toHaveLength(1);
	expect((yield* live.seen).at(-1)).toHaveLength(1);
	yield* app.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	yield* app.settle();
	const seen = yield* live.seen;
	expect(seen.length).toBeGreaterThan(1);
	expect(seen.at(-1)?.at(0)?.status).toBe("parked");
});

it.app("a commit in another scope leaves the live query alone", function* (app) {
	yield* app.seed.piece(launched(1));
	yield* app.seed.piece(launched(2, elsewhere));
	const live = yield* app.live(byVoyage, { voyageId: voyage });
	yield* app.settle();
	const before = (yield* live.seen).length;
	yield* app.commit.pieces.park({ pieceId: pieceId(2), reason: "another voyage" });
	yield* app.settle();
	expect(yield* live.seen).toHaveLength(before);
});

it.app("commits that arrive together coalesce into fewer runs and the last one sees them all", function* (app) {
	yield* Effect.forEach(sweep, (index) => app.seed.piece(launched(index)), { discard: true });
	const live = yield* app.live(byVoyage, { voyageId: voyage });
	yield* app.settle();
	const before = (yield* live.seen).length;
	yield* Effect.forEach(sweep, (index) => app.commit.pieces.park({ pieceId: pieceId(index), reason: "sweep" }), {
		concurrency: "unbounded",
		discard: true,
	});
	yield* app.settle();
	const seen = yield* live.seen;
	expect(seen.length - before).toBeLessThan(sweep.length);
	expect(seen.at(-1)?.every((piece) => piece.status === "parked")).toBe(true);
});
