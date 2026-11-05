import type { observeHostCapability as command } from "@antumbra/domain-changes/commands/host-capability.ts";
import { observeHostCapability as commandDecision } from "@antumbra/server-changes/logic/commands/host-capability.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const observeHostCapability = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.observeHostCapability")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "ChangeHostCapabilityObserved", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
