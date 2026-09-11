import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Option } from "effect";
import { backendCatalog } from "#rows/backend-catalog.ts";

export const catalog = query("catalog", {
	input: { backend: AgentBackendTagSchema },
	output: backendCatalog.Row,
	reads: [backendCatalog],
	scope: (input) => input.backend,
	run: Effect.fn("backends.catalog")(function* (input, rows) {
		const listed = yield* rows.backendCatalog.find(input.backend);
		return Option.isNone(listed) ? { backend: input.backend, failure: null } : listed.value;
	}),
});
