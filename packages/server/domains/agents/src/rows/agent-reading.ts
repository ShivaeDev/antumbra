import { row } from "@antumbra/platform-feature/row.ts";
import { SessionPresenceSchema } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const agentReading = row(
	"agentReading",
	{
		...agent.fields,
		pieceIds: Schema.Array(Schema.String),
		voyageIds: Schema.Array(Schema.String),
		presence: Schema.NullOr(SessionPresenceSchema),
		standing: Schema.String,
		backend: Schema.NullOr(Schema.String),
		atWork: Schema.Boolean,
		canSend: Schema.Boolean,
		canSleep: Schema.Boolean,
		canInterrupt: Schema.Boolean,
		canRetire: Schema.Boolean,
		idleSince: Schema.NullOr(Schema.String),
	},
	{ key: "id" },
);
