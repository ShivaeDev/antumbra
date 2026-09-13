import { row } from "@antumbra/platform-feature/row.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
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
		defaultEffort: Schema.NullOr(Schema.String),
		efforts: Schema.Array(Schema.String),
	},
	{ key: "id", scope: "backend" },
);
