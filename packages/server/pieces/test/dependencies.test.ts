import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

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
	const edges = yield* answered(api["pieces.edges"]({ voyageId: reef }), "pieces.edges");
	expect(edges).toHaveLength(1);
	yield* pieceHistory.rebuild();
	expect(yield* answered(api["pieces.edges"]({ voyageId: reef }), "pieces.edges")).toEqual(edges);
});
