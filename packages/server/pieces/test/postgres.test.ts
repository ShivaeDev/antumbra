import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

postgresApp.it("charters, launches, parks and settles Pieces like the journal", [], function* ({ api, journal, clock, pieceHistory }) {
	const legacy = yield* journal();
	yield* legacy.api.voyages.open(opening);
	yield* api["voyages.open"](opening);
	yield* legacy.api.voyages.quiet({ id: reef, requestId: request("quiet") });
	yield* api["voyages.quiet"]({ id: reef, requestId: request("quiet") });
	const input = { ...chartering("soundings"), title: "  soundings  ", charter: "  sound soundings  ", role: " hand  " };
	yield* legacy.api.pieces.charter(input);
	yield* api["pieces.charter"](input);
	const id = pieceOf("soundings");
	const read = () => answered(legacy.api.pieces.byId({ id }), "the journal Piece");
	expect(yield* api["pieces.byId"]({ id })).toEqual(yield* read());
	expect((yield* api["pieces.byId"]({ id }))?.charteredAt).toBe(new Date(yield* clock.now()).toISOString());
	for (const [index, operation] of ["launch", "launch", "park", "park", "unpark"].entries()) {
		yield* clock.advance(60_000);
		const revision = { id, requestId: request(`${operation}:${index}`) };
		if (operation === "launch") {
			yield* legacy.api.pieces.launch(revision);
			yield* api["pieces.launch"](revision);
		} else if (operation === "park") {
			yield* legacy.api.pieces.park(revision);
			yield* api["pieces.park"](revision);
		} else {
			yield* legacy.api.pieces.unpark(revision);
			yield* api["pieces.unpark"](revision);
		}
		expect(yield* api["pieces.byId"]({ id })).toEqual(yield* read());
		expect(yield* api["pieces.progress"]({ id })).toEqual(yield* answered(legacy.api.pieces.progress({ id }), "journal progress"));
		expect(yield* api["voyages.progress"]({ id: reef })).toEqual(
			yield* answered(legacy.api.voyages.progress({ id: reef }), "journal Voyage progress"),
		);
	}
	const verdict = { id, verdict: "delivered" as const, requestId: request("verdict") };
	yield* legacy.api.pieces.landVerdict(verdict);
	yield* api["pieces.landVerdict"](verdict);
	expect(yield* api["pieces.progress"]({ id })).toEqual(yield* answered(legacy.api.pieces.progress({ id }), "the settled Piece"));
	const before = yield* api["pieces.all"]({});
	yield* pieceHistory.rebuild();
	expect(yield* api["pieces.all"]({})).toEqual(before);
	expect(yield* api["voyages.progress"]({ id: reef })).toEqual(yield* answered(legacy.api.voyages.progress({ id: reef }), "rebuilt Voyage progress"));
});

postgresApp.it(
	"rejects invalid Pieces and revisions without rows, history or refreshes",
	[],
	function* ({ api, pieceHistory, published, clearPublished }) {
		yield* api["voyages.open"](opening);
		yield* clearPublished();
		for (const field of ["title", "charter", "role"] as const) {
			expect(yield* Effect.flip(api["pieces.charter"]({ ...chartering("blank"), [field]: " " }))).toMatchObject({ _tag: "Blank", field });
		}
		expect(yield* Effect.flip(api["pieces.charter"]({ ...chartering("unknown"), dependsOn: ["missing"] }))).toMatchObject({
			_tag: "UnknownDependency",
			pieceId: "missing",
		});
		expect(yield* Effect.flip(api["pieces.charter"]({ ...chartering("missing-voyage"), voyageId: VoyageId.make("missing") }))).toMatchObject({
			_tag: "UnknownVoyage",
			voyageId: "missing",
		});
		const absent = { id: pieceOf("missing"), requestId: request("missing") };
		for (const action of [
			api["pieces.launch"](absent),
			api["pieces.park"](absent),
			api["pieces.unpark"](absent),
			api["pieces.landVerdict"]({ ...absent, verdict: "abandoned" }),
			api["pieces.rewire"]({ ...absent, dependsOn: [] }),
		]) {
			expect(yield* Effect.flip(action)).toMatchObject({ _tag: "Unknown", id: absent.id });
		}
		expect(yield* api["pieces.all"]({})).toEqual([]);
		expect(yield* pieceHistory.read(pieceOf("blank"))).toEqual([]);
		expect(yield* published()).toEqual([]);
		expect(yield* api["pieces.byId"]({ id: absent.id })).toBeNull();
		expect(yield* api["pieces.progress"]({ id: absent.id })).toBeNull();
	},
);
