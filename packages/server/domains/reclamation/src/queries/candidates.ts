import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { canReclaim } from "#eligibility.ts";
import { berth } from "#rows/berth.ts";
import { heldResource } from "#rows/held-resource.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const candidates = query("candidates", {
	input: {},
	output: Schema.Array(moorage.Row),
	reads: [resourceOwner, moorage, berth, heldResource],
	run: Effect.fn("Reclamation.candidates")(function* (_input, rows) {
		const owners = new Map((yield* rows.resourceOwner.where({})).map((owner) => [owner.agentId, owner]));
		const held = new Set((yield* rows.heldResource.where({})).map((entry) => entry.berthId));
		const berths = yield* rows.berth.where({});
		return (yield* rows.moorage.where({})).filter((site) => {
			const owner = owners.get(site.agentId);
			const siblings = berths.filter((candidate) => candidate.agentId === site.agentId);
			return (
				owner !== undefined &&
				canReclaim(owner, site) &&
				!siblings.some((candidate) => held.has(candidate.id)) &&
				siblings.some((candidate) => candidate.runner === site.runner && candidate.status !== "reclaimed" && candidate.reclaimState === null)
			);
		});
	}),
});
