import { observeCapability as command } from "@antumbra/domain-backends/commands/observe-capability.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { Clock, Effect, Schema, type Semaphore } from "effect";

export const observeCapability = (serial: Semaphore.Semaphore) =>
	Effect.fn("Backends.observeCapability")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BackendsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* command.run(input, {}, command.reject);
			const earlier = (yield* history.read()).findLast((event) => event.value._tag === "CapabilityObserved" && event.value.backend === input.backend);
			const unchanged = earlier?.value._tag === "CapabilityObserved" && Schema.toEquivalence(command.emits.Payload)(earlier.value, value);
			return yield* history.append(input.requestId, unchanged ? [] : [{ _tag: "CapabilityObserved", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)),
		serial.withPermit,
	);
