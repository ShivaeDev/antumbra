import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Option, Schema } from "effect";

export const support = query("support", {
	input: { sessionId: Schema.String },
	output: Schema.Struct({ imageInput: Schema.Boolean }),
	reads: [session, backendCatalog],
	run: Effect.fn("inputs.support")(function* (input, rows) {
		const root = yield* rows.session.find(SessionId.make(input.sessionId));
		if (Option.isNone(root) || !Schema.is(AgentBackendTagSchema)(root.value.backend)) return { imageInput: false };
		const known = yield* rows.backendCatalog.find(root.value.backend);
		return { imageInput: Option.isSome(known) && known.value.imageInput === true };
	}),
});
