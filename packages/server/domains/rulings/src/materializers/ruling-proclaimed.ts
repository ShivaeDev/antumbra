import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingProclaimed } from "#facts/ruling-proclaimed.ts";
import { choiceId } from "#ids.ts";
import { requestWrites, writeRequested } from "#materializers/requested.ts";
export const rulingProclaimedMaterializer = materializer(rulingProclaimed, {
	writes: requestWrites,
	run: Effect.fn("rulings.proclaimed")(function* (fact, rows) {
		yield* writeRequested({ ...fact, requester: { kind: "authority", by: fact.by }, rung: null, gates: [], recommendation: null }, rows);
		const position = fact.choices.findIndex((choice) => choice.label === fact.chosenChoice);
		yield* rows.ruling.update(fact.id, {
			answer: {
				text: fact.answer,
				choiceId: position < 0 ? null : choiceId(fact.id, position),
				by: fact.by,
				byAgentId: null,
				at: new Date(fact.at).toISOString(),
			},
		});
	}),
});
