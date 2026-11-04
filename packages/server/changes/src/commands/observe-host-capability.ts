import { observeHostCapability as command } from "@antumbra/domain-changes/commands/host-capability.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const observeHostCapability = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.observeHostCapability")(function* (input: typeof command.Input.Type) {
		const history = yield* ChangesHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "ChangeHostCapabilityObserved", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
