import { listModels as command } from "@antumbra/domain-backends/commands/list-models.ts";
import { listModels as commandDecision } from "@antumbra/server-backends/logic/commands/list-models.ts";
import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, Schema, type Semaphore } from "effect";
export const listModels = (serial: Semaphore.Semaphore) =>
	Effect.fn("Backends.listModels")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BackendsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			const earlier = (yield* history.read()).findLast((event) => event.value._tag === "ModelsListed" && event.value.backend === input.backend);
			const unchanged = earlier?.value._tag === "ModelsListed" && Schema.toEquivalence(command.emits.Payload)(earlier.value, value);
			return yield* history.append(input.requestId, unchanged ? [] : [{ _tag: "ModelsListed", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)),
		serial.withPermit,
		withExecutionWrite,
	);
