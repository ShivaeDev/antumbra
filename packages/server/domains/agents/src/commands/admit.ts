import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birthAdmitted } from "#facts/birth-admitted.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";

export const admit = command("admit", {
	input: { id: BirthId, backend: Schema.String, model: Schema.String, effort: Schema.NullOr(Schema.String) },
	reads: [pieceProgress, birth, agent, session, count, flag, capacity, voyage],
	emits: birthAdmitted,
	rejections: {
		NotEligible: { id: Schema.String },
		Unknown: { id: Schema.String },
		NotRequested: { id: Schema.String },
		Held: { reason: Schema.String },
		NoSlot: { limit: Schema.Number },
		NotOldest: { id: Schema.String },
	},
});
