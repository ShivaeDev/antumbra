import { row } from "@antumbra/platform-feature/row.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const sessionToolCall = row(
	"sessionToolCall",
	{
		id: Schema.String,
		sessionId: SessionId,
		name: Schema.String,
		input: Schema.String,
		answeredAt: Schema.NullOr(Schema.String),
		answer: Schema.NullOr(ToolAnswer),
		calledAt: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "sessionId" },
);
