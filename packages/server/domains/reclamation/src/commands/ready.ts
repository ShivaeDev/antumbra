import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { moorageReady } from "#facts/moorage-ready.ts";
import { berth } from "#rows/berth.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const ready = command("ready", {
	input: moorageReady.payload,
	reads: [resourceOwner, moorage, berth],
	emits: moorageReady,
	rejections: { OwnerUnavailable: { agentId: Schema.String }, Claimed: { agentId: Schema.String }, MissingPlan: { agentId: Schema.String } },
});
