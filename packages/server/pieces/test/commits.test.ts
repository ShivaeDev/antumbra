import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, request } from "#test/kit.ts";

postgresApp.it(
	"keeps pending rows and refreshes invisible until commit and discards rollback",
	[],
	function* ({ api, pieceHistory, published, clearPublished, transaction, rollback }) {
		yield* api["voyages.open"](opening);
		yield* api["pieces.charter"](chartering("soundings"));
		yield* clearPublished();
		const id = pieceOf("soundings");
		const before = yield* answered(api["pieces.byId"]({ id }), "pieces.byId");
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* pieceHistory.append(request("launch"), { _tag: "PieceLaunched", id, launchedAt: "2026-11-03T12:00:00.000Z" });
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* answered(api["pieces.byId"]({ id }), "pieces.byId")).toEqual(before);
		expect(yield* answered(api["pieces.progress"]({ id }), "pieces.progress")).toMatchObject({ state: "held" });
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["pieces.progress"]({ id }), "pieces.progress")).toMatchObject({ state: "ready" });
		expect(yield* published()).toContain("pieceProgress");
		yield* clearPublished();
		yield* rollback(pieceHistory.append(request("rollback"), { _tag: "PieceParked", id, parkedAt: "2026-11-03T13:00:00.000Z" }));
		expect(yield* answered(api["pieces.progress"]({ id }), "pieces.progress")).toMatchObject({ state: "ready" });
		expect((yield* pieceHistory.read(id)).map((event) => event.value._tag)).toEqual(["PieceChartered", "PieceLaunched"]);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"recognizes repeated requests before validating a different payload",
	[],
	function* ({ api, pieceHistory, clearPublished, published }) {
		yield* api["voyages.open"](opening);
		const input = chartering("soundings");
		const first = yield* api["pieces.charter"](input);
		yield* clearPublished();
		expect(yield* Effect.flip(api["pieces.charter"]({ ...input, title: "" }))).toMatchObject({ _tag: "AlreadyDone", seq: first });
		expect(yield* pieceHistory.read(pieceOf("soundings"))).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);
