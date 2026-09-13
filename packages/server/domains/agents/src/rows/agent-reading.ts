import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { AgentStateSchema } from "#rows/situation.ts";
export const agentReading = row(
	"agentReading",
	{
		...agent.fields,
		pieceIds: Schema.Array(Schema.String),
		voyageIds: Schema.Array(Schema.String),
		state: AgentStateSchema,
		standing: Schema.String,
		detail: Schema.NullOr(Schema.String),
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
