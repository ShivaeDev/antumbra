import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { mooragePlanned } from "#facts/moorage-planned.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const plan = command("plan", {
	input: mooragePlanned.payload,
	reads: [resourceOwner, moorage, berth],
	emits: mooragePlanned,
	rejections: { OwnerUnavailable: { agentId: Schema.String }, Claimed: { agentId: Schema.String }, PlanConflict: { agentId: Schema.String } },
	run: Effect.fn("Reclamation.plan")(function* (input, rows, reject) {
		const owner = yield* rows.resourceOwner.find(input.agentId);
		if (Option.isNone(owner) || owner.value.status === "retired" || owner.value.status === "dormant") return yield* reject.OwnerUnavailable(input);
		const site = yield* rows.moorage.find(input.agentId);
		const berths = yield* rows.berth.where({ agentId: input.agentId });
		if ((Option.isSome(site) && site.value.reclaimState === "claimed") || berths.some((candidate) => candidate.reclaimState === "claimed")) {
			return yield* reject.Claimed(input);
		}
		if (Option.isSome(site)) {
			if (site.value.runner !== input.runner) return yield* reject.PlanConflict(input);
			return { agentId: input.agentId, runner: input.runner, plan: { root: site.value.root, berths } };
		}
		return input;
	}),
});
