import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Schema } from "effect";
import { capacityObserved, capacityReleased } from "#facts.ts";

export const observe = command("observe", {
	input: capacityObserved.payload,
	reads: [],
	emits: capacityObserved,
	rejections: {},
	run: (input) => Effect.succeed(input),
});

export const release = command("release", {
	input: capacityReleased.payload,
	reads: [backendCatalog],
	emits: capacityReleased,
	rejections: { UnknownBackend: { backend: AgentBackendTagSchema, message: Schema.String } },
	run: Effect.fn("capacity.release")(function* (input, rows, reject) {
		if (!(yield* rows.backendCatalog.exists(input.backend))) {
			return yield* reject.UnknownBackend({ backend: input.backend, message: "This provider is not registered." });
		}
		return input;
	}),
});
