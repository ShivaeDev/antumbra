import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Schema } from "effect";
import { berthHeld } from "#facts/berth-held.ts";
import { berth } from "#rows/berth.ts";

export const held = command("held", {
	input: { id: BerthId, claimRequestId: Request, reason: Schema.String },
	reads: [berth],
	emits: berthHeld,
	rejections: { StaleClaim: { id: Schema.String } },
});
