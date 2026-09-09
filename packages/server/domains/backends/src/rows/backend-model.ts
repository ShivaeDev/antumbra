import { row } from "@antumbra/feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { BackendModelId } from "#ids.ts";

export const backendModel = row(
	"backendModel",
	{
		id: BackendModelId,
		backend: AgentBackendTagSchema,
		model: Schema.String,
		name: Schema.String,
		isDefault: Schema.Boolean,
		efforts: Schema.Array(Schema.String),
	},
	{ key: "id", scope: "backend" },
);
