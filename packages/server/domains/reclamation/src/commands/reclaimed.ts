import { command } from "@antumbra/platform-feature/command.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Schema } from "effect";
import { berthReclaimed } from "#facts/berth-reclaimed.ts";
import { berth } from "#rows/berth.ts";

export const reclaimed = command("reclaimed", {
	input: { id: BerthId, claimRequestId: Request },
	reads: [berth],
	emits: berthReclaimed,
	rejections: { StaleClaim: { id: Schema.String } },
});
