import { Context, type Effect, Layer } from "effect";
import { initialize } from "#postgres/execution/initialize.ts";
export class ExecutionHistory extends Context.Service<ExecutionHistory, Effect.Success<typeof initialize>>()(
	"@antumbra/server-journal/ExecutionHistory",
) {
	static readonly layer = Layer.effect(ExecutionHistory, initialize);
}
