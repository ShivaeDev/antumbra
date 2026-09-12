import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { UsageEvidence } from "#usage/evidence.ts";

export const sessionUsage = row(
	"sessionUsage",
	{
		id: Schema.String,
		sessionId: SessionId,
		agentId: Schema.String,
		backend: Schema.String,
		observedAt: Schema.Number,
		usage: UsageEvidence,
	},
	{ key: "id", scope: "agentId" },
);
