import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { resourcesClaimed } from "#facts/resources-claimed.ts";
import { canReclaim } from "#queries/eligibility.ts";
import { berth } from "#rows/berth.ts";
import { heldResource } from "#rows/held-resource.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const claim = command("claim", {
	input: { agentId: Schema.String },
	reads: [resourceOwner, moorage, berth, heldResource],
	emits: resourcesClaimed,
	rejections: { Ineligible: { agentId: Schema.String }, Held: { agentId: Schema.String }, NothingToReclaim: { agentId: Schema.String } },
	run: Effect.fn("Reclamation.claim")(function* (input, rows, reject) {
		const site = yield* rows.moorage.find(input.agentId);
		const owner = yield* rows.resourceOwner.find(input.agentId);
		if (Option.isNone(site) || Option.isNone(owner)) return yield* reject.Ineligible(input);
		const berths = yield* rows.berth.where({ agentId: input.agentId });
		const claimed = berths.filter((candidate) => candidate.reclaimState === "claimed");
		const eligible = canReclaim(owner.value, site.value);
		if (!eligible && claimed.length === 0) return yield* reject.Ineligible(input);
		const held = yield* rows.heldResource.where({});
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
	}),
});
