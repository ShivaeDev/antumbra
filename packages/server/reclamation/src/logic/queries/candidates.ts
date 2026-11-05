import type * as Source from "@antumbra/domain-reclamation/queries/candidates.ts";
import { canReclaim } from "@antumbra/domain-reclamation/queries/eligibility.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as heldResourceSelection } from "@antumbra/server-storage/records/held-resource.ts";
import { selection as moorageSelection } from "@antumbra/server-storage/records/moorage.ts";
import { selection as resourceOwnerSelection } from "@antumbra/server-storage/records/resource-owner.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const candidates = Effect.fn("Reclamation.candidates")(function* (
	_input: Schema.Struct.Type<typeof Source.candidates.input>,
): Effect.fn.Return<typeof Source.candidates.output.Type, never, Records> {
	const rows = yield* Records;

	const owners = new Map(
		(yield* rows.resourceOwner
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: resourceOwnerSelection })
			.pipe(Effect.orDie)).map((owner) => [owner.agentId, owner]),
	);
	const held = new Set(
		(yield* rows.heldResource
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: heldResourceSelection })
			.pipe(Effect.orDie)).map((entry) => entry.berthId),
	);
	const berths = yield* rows.berth
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
		.pipe(Effect.orDie);
	return (yield* rows.moorage
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: moorageSelection })
		.pipe(Effect.orDie)).filter((site) => {
		const owner = owners.get(site.agentId);
		const siblings = berths.filter((candidate) => candidate.agentId === site.agentId);
		return (
			owner !== undefined &&
			canReclaim(owner, site) &&
			!siblings.some((candidate) => held.has(candidate.id)) &&
			siblings.some((candidate) => candidate.runner === site.runner && candidate.status !== "reclaimed" && candidate.reclaimState === null)
		);
	});
});
