import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { captainReading } from "#rows/captain-reading.ts";
export const captain = query("captainReading", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(captainReading.Row),
	reads: [captainReading],
	run: Effect.fn("Agents.captainReading")(function* (input, rows) {
		return Option.getOrNull(yield* rows.captainReading.find(input.voyageId));
	}),
});
