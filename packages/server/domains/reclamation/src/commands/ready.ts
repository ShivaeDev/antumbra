import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { moorageReady } from "#facts/moorage-ready.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const ready = command("ready", {
	input: moorageReady.payload,
	reads: [resourceOwner, moorage, berth],
	emits: moorageReady,
	rejections: { OwnerUnavailable: { agentId: Schema.String }, Claimed: { agentId: Schema.String }, MissingPlan: { agentId: Schema.String } },
	run: Effect.fn("Reclamation.ready")(function* (input, rows, reject) {
		const owner = yield* rows.resourceOwner.find(input.agentId);
		if (Option.isNone(owner) || owner.value.status === "dormant" || owner.value.status === "retired") return yield* reject.OwnerUnavailable(input);
		const site = yield* rows.moorage.find(input.agentId);
		if (Option.isNone(site)) return yield* reject.MissingPlan(input);
		const berths = yield* rows.berth.where({ agentId: input.agentId });
		if (site.value.reclaimState === "claimed" || berths.some((candidate) => candidate.reclaimState === "claimed"))
			return yield* reject.Claimed(input);
		return input;
	}),
});
