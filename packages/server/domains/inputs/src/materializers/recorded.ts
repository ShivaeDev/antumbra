import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { inputRecorded } from "#facts/recorded.ts";
import { sessionInput } from "#rows/input.ts";
export const recorded = materializer(inputRecorded, {
	writes: [sessionInput],
	run: Effect.fn("inputs.InputRecorded")(function* (fact, rows) {
		yield* rows.sessionInput.insert({
			id: fact.id,
			sessionId: fact.sessionId,
			requestDigest: fact.requestDigest,
			parts: fact.parts,
			status: "pending",
			detail: null,
			createdAt: fact.at,
		});
	}),
});
