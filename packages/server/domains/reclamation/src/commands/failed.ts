import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option, Schema } from "effect";
import { berthReclaimFailed } from "#facts/berth-reclaim-failed.ts";
import { BerthId } from "#ids.ts";
import { berth } from "#rows/berth.ts";

export const failed = command("failed", {
	input: { id: BerthId, claimRequestId: Request, reason: Schema.String },
	reads: [berth],
	emits: berthReclaimFailed,
	rejections: { StaleClaim: { id: Schema.String } },
	run: Effect.fn("Reclamation.failed")(function* (input, rows, reject) {
		const stored = yield* rows.berth.find(input.id);
		if (Option.isNone(stored) || stored.value.reclaimRequestId !== input.claimRequestId) return yield* reject.StaleClaim({ id: input.id });
		return { id: input.id, claimRequestId: input.claimRequestId, reason: input.reason };
	}),
});
