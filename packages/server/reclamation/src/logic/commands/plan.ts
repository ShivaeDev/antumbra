import type * as Source from "@antumbra/domain-reclamation/commands/plan.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as moorageSelection } from "@antumbra/server-storage/records/moorage.ts";
import { selection as resourceOwnerSelection } from "@antumbra/server-storage/records/resource-owner.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const plan = Effect.fn("Reclamation.plan")(function* (
	input: typeof Source.plan.Input.Type,
	reject: typeof Source.plan.reject,
): Effect.fn.Return<typeof Source.plan.emits.Payload.Type, RejectedBy<typeof Source.plan.rejections>, Records> {
	const rows = yield* Records;

	const owner = yield* rows.resourceOwner
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: resourceOwnerSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(owner) || owner.value.status === "retired" || owner.value.status === "dormant") return yield* reject.OwnerUnavailable(input);
	const site = yield* rows.moorage
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: moorageSelection })
		.pipe(Effect.orDie);
	const berths = yield* rows.berth
		.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	if ((Option.isSome(site) && site.value.reclaimState === "claimed") || berths.some((candidate) => candidate.reclaimState === "claimed")) {
		return yield* reject.Claimed(input);
	}
	if (Option.isSome(site)) {
		if (site.value.runner !== input.runner) return yield* reject.PlanConflict(input);
		return { agentId: input.agentId, runner: input.runner, plan: { root: site.value.root, berths } };
	}
	return input;
});
