import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { mooragePlanned } from "#facts/moorage-planned.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const plan = command("plan", {
	input: mooragePlanned.payload,
	reads: [resourceOwner, moorage, berth],
	emits: mooragePlanned,
	rejections: { OwnerUnavailable: { agentId: Schema.String }, Claimed: { agentId: Schema.String }, PlanConflict: { agentId: Schema.String } },
});
