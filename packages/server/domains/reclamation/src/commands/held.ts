import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option, Schema } from "effect";
import { berthHeld } from "#facts/berth-held.ts";
import { BerthId } from "#ids.ts";
import { berth } from "#rows/berth.ts";

export const held = command("held", {
	input: { id: BerthId, claimRequestId: Request, reason: Schema.String },
	reads: [berth],
	emits: berthHeld,
	rejections: { StaleClaim: { id: Schema.String } },
	run: Effect.fn("Reclamation.held")(function* (input, rows, reject) {
		const stored = yield* rows.berth.find(input.id);
		if (Option.isNone(stored) || stored.value.reclaimRequestId !== input.claimRequestId) return yield* reject.StaleClaim({ id: input.id });
		return { id: input.id, reason: input.reason };
	}),
});
