import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

postgresApp.it("publishes the same Piece refresh keys as the journal", [], function* ({ api, journal, clearPublished, published }) {
	const legacy = yield* journal();
	yield* legacy.api.voyages.open(opening);
	yield* legacy.api.voyages.quiet({ id: reef });
	yield* api["voyages.open"](opening);
	yield* legacy.api.pieces.charter(chartering("charts"));
	yield* api["pieces.charter"](chartering("charts"));
	const id = pieceOf("soundings");
	const keys = [
		"piece",
		`piece:${reef}`,
		"pieceEdge",
		`pieceEdge:${id}`,
		"pieceProgress",
		`pieceProgress:${reef}`,
		"voyagePieceProgress",
		`voyagePieceProgress:${reef}`,
		"voyageProgress",
	];
	const watched = yield* legacy.watchKeys(keys);
	yield* clearPublished();
	yield* legacy.api.pieces.charter(chartering("soundings", [pieceOf("charts")]));
	yield* api["pieces.charter"](chartering("soundings", [pieceOf("charts")]));
	expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
	for (const [index, operation] of ["launch", "park", "unpark"].entries()) {
		watched.clear();
		yield* clearPublished();
		const input = { id, requestId: request(`act:${index}`) };
		if (operation === "launch") {
			yield* legacy.api.pieces.launch(input);
			yield* api["pieces.launch"](input);
		} else if (operation === "park") {
			yield* legacy.api.pieces.park(input);
			yield* api["pieces.park"](input);
		} else {
			yield* legacy.api.pieces.unpark(input);
			yield* api["pieces.unpark"](input);
		}
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
	}
	watched.clear();
	yield* clearPublished();
	const rewire = { id, dependsOn: [], requestId: request("rewire") };
	yield* legacy.api.pieces.rewire(rewire);
	yield* api["pieces.rewire"](rewire);
	expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
	watched.clear();
	yield* clearPublished();
	const verdict = { id: pieceOf("charts"), verdict: "delivered" as const, requestId: request("verdict") };
	yield* legacy.api.pieces.landVerdict(verdict);
	yield* api["pieces.landVerdict"](verdict);
	expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
});

postgresApp.it(
	"keeps pending rows and refreshes invisible until commit and discards rollback",
	[],
	function* ({ api, pieceHistory, published, clearPublished, transaction, rollback }) {
		yield* api["voyages.open"](opening);
		yield* api["pieces.charter"](chartering("soundings"));
		yield* clearPublished();
		const id = pieceOf("soundings");
		const before = yield* api["pieces.byId"]({ id });
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
		expect(yield* api["pieces.byId"]({ id })).toEqual(before);
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "held" });
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "ready" });
		expect(yield* published()).toContain("pieceProgress");
		yield* clearPublished();
		yield* rollback(pieceHistory.append(request("rollback"), { _tag: "PieceParked", id, parkedAt: "2026-11-03T13:00:00.000Z" }));
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "ready" });
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
