import { row } from "@antumbra/platform-feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";

export const backendCatalog = row(
	"backendCatalog",
	{
		backend: AgentBackendTagSchema,
		failure: Schema.NullOr(Schema.String),
		imageInput: Schema.NullOr(Schema.Boolean),
	},
	{ key: "backend", scope: "backend" },
);
