import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SmoothingTarget } from "#queries/smoothing-targets.ts";

const { entries: _entries, ...target } = SmoothingTarget.fields;
export const smoothingSession = row(
	"smoothingSession",
	{
		sessionId: Schema.String,
		attemptId: Schema.String,
		agentId: Schema.String,
		...target,
		status: Schema.Literals(["waiting", "written", "empty", "silent", "timedOut"]),
	},
	{ key: "sessionId", scope: "attemptId" },
);
