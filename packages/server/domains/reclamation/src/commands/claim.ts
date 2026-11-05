import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { resourcesClaimed } from "#facts/resources-claimed.ts";
import { berth } from "#rows/berth.ts";
import { heldResource } from "#rows/held-resource.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const claim = command("claim", {
	input: { agentId: Schema.String },
	reads: [resourceOwner, moorage, berth, heldResource],
	emits: resourcesClaimed,
	rejections: { Ineligible: { agentId: Schema.String }, Held: { agentId: Schema.String }, NothingToReclaim: { agentId: Schema.String } },
});
