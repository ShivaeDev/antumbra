import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option, Schema } from "effect";
import { berthReclaimed } from "#facts/berth-reclaimed.ts";
import { BerthId } from "#ids.ts";
import { berth } from "#rows/berth.ts";

export const reclaimed = command("reclaimed", {
	input: { id: BerthId, claimRequestId: Request },
	reads: [berth],
	emits: berthReclaimed,
	rejections: { StaleClaim: { id: Schema.String } },
	run: Effect.fn("Reclamation.reclaimed")(function* (input, rows, reject) {
		const stored = yield* rows.berth.find(input.id);
		if (Option.isNone(stored) || stored.value.reclaimRequestId !== input.claimRequestId) return yield* reject.StaleClaim({ id: input.id });
		return { id: input.id };
	}),
});
