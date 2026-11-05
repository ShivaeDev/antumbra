import type { rulingProclaimed } from "@antumbra/domain-rulings/facts/ruling-proclaimed.ts";
import { choiceId } from "@antumbra/domain-rulings/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { writeRequested } from "#projections/rulings/requested.ts";
import { Records } from "#records.ts";
export const rulingProclaimedMaterializer = Effect.fn("rulings.proclaimed")(function* (
	fact: FactValue<typeof rulingProclaimed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* writeRequested({ ...fact, requester: { kind: "authority", by: fact.by }, rung: null, gates: [], recommendation: null });
	const position = fact.choices.findIndex((choice) => choice.label === fact.chosenChoice);
	yield* rows.ruling
		.updateVoid({
			...{
				answer: {
					text: fact.answer,
					choiceId: position < 0 ? null : choiceId(fact.id, position),
					by: fact.by,
					byAgentId: null,
					at: new Date(fact.at).toISOString(),
				},
			},
			id: fact.id,
		})
		.pipe(Effect.orDie);
});
