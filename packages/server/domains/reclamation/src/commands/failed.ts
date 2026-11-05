import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Schema } from "effect";
import { berthReclaimFailed } from "#facts/berth-reclaim-failed.ts";
import { berth } from "#rows/berth.ts";

export const failed = command("failed", {
	input: { id: BerthId, claimRequestId: Request, reason: Schema.String },
	reads: [berth],
	emits: berthReclaimFailed,
	rejections: { StaleClaim: { id: Schema.String } },
});
