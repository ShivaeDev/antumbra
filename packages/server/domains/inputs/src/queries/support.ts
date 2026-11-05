import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";

export const support = query("support", {
	input: { sessionId: Schema.String },
	output: Schema.Struct({ imageInput: Schema.Boolean }),
	reads: [session, backendCatalog],
});
