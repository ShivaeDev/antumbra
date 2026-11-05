import type * as Source from "@antumbra/domain-reclamation/commands/claim.ts";
import { canReclaim } from "@antumbra/domain-reclamation/queries/eligibility.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as heldResourceSelection } from "@antumbra/server-storage/records/held-resource.ts";
import { selection as moorageSelection } from "@antumbra/server-storage/records/moorage.ts";
import { selection as resourceOwnerSelection } from "@antumbra/server-storage/records/resource-owner.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const claim = Effect.fn("Reclamation.claim")(function* (
	input: typeof Source.claim.Input.Type,
	reject: typeof Source.claim.reject,
): Effect.fn.Return<typeof Source.claim.emits.Payload.Type, RejectedBy<typeof Source.claim.rejections>, Records> {
	const rows = yield* Records;

	const site = yield* rows.moorage
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: moorageSelection })
		.pipe(Effect.orDie);
	const owner = yield* rows.resourceOwner
		.findOne({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: resourceOwnerSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(site) || Option.isNone(owner)) return yield* reject.Ineligible(input);
	const berths = yield* rows.berth
		.findMany({ where: { agentId: input.agentId }, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	const claimed = berths.filter((candidate) => candidate.reclaimState === "claimed");
	const eligible = canReclaim(owner.value, site.value);
	if (!eligible && claimed.length === 0) return yield* reject.Ineligible(input);
	const held = yield* rows.heldResource
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: heldResourceSelection })
		.pipe(Effect.orDie);
	const heldIds = new Set(held.map((entry) => entry.berthId));
	const heldAgent = berths.some((candidate) => heldIds.has(candidate.id));
	if (heldAgent && claimed.length === 0) return yield* reject.Held(input);
	const candidates = berths.filter(
		(candidate) =>
			(candidate.reclaimState === "claimed" && candidate.reclaimResult !== null) ||
			(candidate.reclaimState === null && eligible && !heldAgent && candidate.runner === site.value.runner && candidate.status !== "reclaimed"),
	);
	if (candidates.length === 0) return yield* reject.NothingToReclaim(input);
	return { agentId: input.agentId, berthIds: candidates.map((candidate) => candidate.id) };
});
