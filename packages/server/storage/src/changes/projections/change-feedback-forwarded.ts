import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeFeedbackForwarded = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeFeedbackForwarded")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeFeedbackForwarded" }>,
	) {
		const forwardedAt = new Date(fact.at).toISOString();
		for (const id of fact.ids) yield* rows.changeFeedback.updateVoid({ ...{ forwardedAt }, id: id }).pipe(Effect.orDie);
	});
