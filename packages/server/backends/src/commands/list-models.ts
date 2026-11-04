import { listModels as command } from "@antumbra/domain-backends/commands/list-models.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { Clock, Effect, Schema, type Semaphore } from "effect";
export const listModels = (serial: Semaphore.Semaphore) =>
	Effect.fn("Backends.listModels")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BackendsHistory;
			yield* history.checkRequest(input.requestId);
			const rows = yield* history.rows();
			const value = yield* command.run(input, rows, command.reject);
			const earlier = (yield* history.read()).findLast((event) => event.value._tag === "ModelsListed" && event.value.backend === input.backend);
			const unchanged = earlier?.value._tag === "ModelsListed" && Schema.toEquivalence(command.emits.Payload)(earlier.value, value);
			return yield* history.append(input.requestId, unchanged ? [] : [{ _tag: "ModelsListed", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)),
		serial.withPermit,
	);
