import type * as Source from "@antumbra/domain-reclamation/commands/ready.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as moorageSelection } from "@antumbra/server-storage/records/moorage.ts";
import { selection as resourceOwnerSelection } from "@antumbra/server-storage/records/resource-owner.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const ready = Effect.fn("Reclamation.ready")(function* (
	input: typeof Source.ready.Input.Type,
	reject: typeof Source.ready.reject,
): Effect.fn.Return<typeof Source.ready.emits.Payload.Type, RejectedBy<typeof Source.ready.rejections>, Records> {
	const rows = yield* Records;

	const owner = yield* rows.resourceOwner
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: resourceOwnerSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(owner) || owner.value.status === "dormant" || owner.value.status === "retired") return yield* reject.OwnerUnavailable(input);
	const site = yield* rows.moorage
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: moorageSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(site)) return yield* reject.MissingPlan(input);
	const berths = yield* rows.berth
		.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	if (site.value.reclaimState === "claimed" || berths.some((candidate) => candidate.reclaimState === "claimed")) return yield* reject.Claimed(input);
	return input;
});
