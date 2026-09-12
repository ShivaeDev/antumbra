import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const sessionEvent = row(
	"sessionEvent",
	{
		id: Schema.String,
		sessionId: SessionId,
		rootSessionId: SessionId,
		logId: Schema.String,
		cursor: Schema.Number,
		observedAt: Schema.Number,
		sequence: Schema.Number,
	},
	{ key: "id", scope: "sessionId" },
);
