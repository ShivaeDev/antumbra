import { Effect } from "effect";
import { BackendCatalog } from "#backend-catalog/service.ts";

export const initialize = Effect.fn("AgentToolCompiler.initialize")(function* () {
	const catalog = yield* BackendCatalog;
	return (yield* catalog.snapshot()).backends;
})();
