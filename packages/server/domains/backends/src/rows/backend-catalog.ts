import { row } from "@antumbra/feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend.ts";
import { Schema } from "effect";

export const backendCatalog = row(
	"backendCatalog",
	{
		backend: AgentBackendTagSchema,
		failure: Schema.NullOr(Schema.String),
	},
	{ key: "backend", scope: "backend" },
);
