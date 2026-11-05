import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, request } from "#test/kit.ts";

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
		expect(yield* answered(api["pieces.all"]({}), "pieces.all")).toEqual([]);
		expect(yield* pieceHistory.read(pieceOf("blank"))).toEqual([]);
		expect(yield* published()).toEqual([]);
		expect(yield* answered(api["pieces.byId"]({ id: absent.id }), "pieces.byId")).toBeNull();
		expect(yield* answered(api["pieces.progress"]({ id: absent.id }), "pieces.progress")).toBeNull();
	},
);
