import { row } from "@antumbra/platform-feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";

export const capacity = row(
	"capacity",
	{
		backend: AgentBackendTagSchema,
		status: Schema.Literals(["available", "blocked", "warning"]),
		reason: Schema.NullOr(Schema.Literal("usage-limit")),
		detail: Schema.NullOr(Schema.String),
		observedAt: Schema.NullOr(Schema.Number),
		resetsAt: Schema.NullOr(Schema.Number),
		utilization: Schema.NullOr(Schema.Number),
	},
	{ key: "backend" },
);
