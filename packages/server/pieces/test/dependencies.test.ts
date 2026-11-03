import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

postgresApp.it(
	"rewires cross-Voyage dependencies and releases them after settlement",
	[],
	function* ({ api, journal, clock, pieceHistory, published, clearPublished }) {
		const legacy = yield* journal();
		const other = VoyageId.make("voyage:harbour");
		for (const voyageId of [reef, other]) {
			const input = { ...opening, requestId: request(voyageId) };
			yield* legacy.api.voyages.open(input);
			yield* api["voyages.open"](input);
			yield* legacy.api.voyages.quiet({ id: voyageId });
			yield* api["voyages.quiet"]({ id: voyageId, requestId: request(`quiet:${voyageId}`) });
		}
		for (const input of [chartering("Zulu"), { ...chartering("Alpha", [pieceOf("Zulu"), pieceOf("Zulu")]), voyageId: other }]) {
			yield* legacy.api.pieces.charter(input);
			yield* api["pieces.charter"](input);
		}
		for (const id of [pieceOf("Zulu"), pieceOf("Alpha")]) {
			const input = { id, requestId: request(`launch:${id}`) };
			yield* legacy.api.pieces.launch(input);
			yield* api["pieces.launch"](input);
		}
		expect(yield* api["pieces.progress"]({ id: pieceOf("Alpha") })).toMatchObject({ state: "blocked", eligible: false });
		const before = yield* api["pieces.edges"]({ voyageId: other });
		yield* clearPublished();
		for (const input of [
			{ id: pieceOf("Zulu"), dependsOn: [pieceOf("Alpha")], requestId: request("cycle") },
			{ id: pieceOf("Zulu"), dependsOn: [pieceOf("Zulu")], requestId: request("self") },
			{ id: pieceOf("Zulu"), dependsOn: ["missing"], requestId: request("unknown") },
		]) {
			expect(yield* Effect.flip(api["pieces.rewire"](input))).toMatchObject(yield* Effect.flip(legacy.api.pieces.rewire(input)));
		}
		expect(yield* api["pieces.edges"]({ voyageId: other })).toEqual(before);
		expect(yield* published()).toEqual([]);
		yield* clock.advance(60_000);
		const verdict = { id: pieceOf("Zulu"), verdict: "abandoned" as const, requestId: request("abandoned") };
		yield* legacy.api.pieces.landVerdict(verdict);
		yield* api["pieces.landVerdict"](verdict);
		expect(yield* api["pieces.progress"]({ id: pieceOf("Alpha") })).toMatchObject({ state: "ready", eligible: true });
		const wanted = { id: pieceOf("Alpha"), dependsOn: [], requestId: request("clear-wiring") };
		yield* legacy.api.pieces.rewire(wanted);
		yield* api["pieces.rewire"](wanted);
		yield* pieceHistory.rebuild();
		expect(yield* api["pieces.all"]({})).toEqual(yield* answered(legacy.api.pieces.all({}), "all journal Pieces"));
		for (const voyageId of [reef, other]) {
			expect(yield* api["pieces.byVoyage"]({ voyageId })).toEqual(yield* answered(legacy.api.pieces.byVoyage({ voyageId }), "Voyage membership"));
			expect(yield* api["pieces.edges"]({ voyageId })).toEqual(yield* answered(legacy.api.pieces.edges({ voyageId }), "dependency edges"));
			expect(yield* api["pieces.displayByVoyage"]({ voyageId })).toEqual(
				yield* answered(legacy.api.pieces.displayByVoyage({ voyageId }), "Piece display order"),
			);
			expect(yield* api["voyages.progress"]({ id: voyageId })).toEqual(
				yield* answered(legacy.api.voyages.progress({ id: voyageId }), "Voyage progress"),
			);
		}
		expect(yield* api["pieces.dependencies"]({ id: wanted.id })).toEqual([]);
		expect(yield* api["pieces.ready"]({})).toEqual(yield* answered(legacy.api.pieces.ready({}), "ready Pieces"));
		expect(yield* api["pieces.others"]({ id: pieceOf("Zulu"), voyageId: reef })).toEqual([]);
		expect(yield* api["pieces.reach"]({ voyageId: reef, pieceIds: [pieceOf("Zulu"), pieceOf("Alpha"), "missing", "missing"] })).toEqual([
			pieceOf("Alpha"),
			"missing",
			"missing",
		]);
	},
);

postgresApp.it("serializes opposing dependency edits before either guard accepts them", [], function* ({ api, pieceHistory }) {
	yield* api["voyages.open"](opening);
	for (const name of ["soundings", "charts"]) yield* api["pieces.charter"](chartering(name));
	const results = yield* Effect.all(
		[
			api["pieces.rewire"]({ id: pieceOf("soundings"), dependsOn: [pieceOf("charts")], requestId: request("forward") }),
			api["pieces.rewire"]({ id: pieceOf("charts"), dependsOn: [pieceOf("soundings")], requestId: request("backward") }),
		].map((action) => action.pipe(Effect.catchTag("WouldCycle", () => Effect.succeed("cycle")))),
		{ concurrency: 2 },
	);
	expect(results.filter((result) => result === "cycle")).toHaveLength(1);
	const edges = yield* api["pieces.edges"]({ voyageId: reef });
	expect(edges).toHaveLength(1);
	yield* pieceHistory.rebuild();
	expect(yield* api["pieces.edges"]({ voyageId: reef })).toEqual(edges);
});
