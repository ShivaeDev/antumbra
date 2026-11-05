import { observeCapability as command } from "@antumbra/domain-backends/commands/observe-capability.ts";
import { observeCapability as commandDecision } from "@antumbra/server-backends/logic/commands/observe-capability.ts";
import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, Schema, type Semaphore } from "effect";

export const observeCapability = (serial: Semaphore.Semaphore) =>
	Effect.fn("Backends.observeCapability")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BackendsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			const earlier = (yield* history.read()).findLast((event) => event.value._tag === "CapabilityObserved" && event.value.backend === input.backend);
			const unchanged = earlier?.value._tag === "CapabilityObserved" && Schema.toEquivalence(command.emits.Payload)(earlier.value, value);
			return yield* history.append(input.requestId, unchanged ? [] : [{ _tag: "CapabilityObserved", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)),
		serial.withPermit,
		withExecutionWrite,
	);
