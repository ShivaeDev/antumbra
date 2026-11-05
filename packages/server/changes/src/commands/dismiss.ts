import { dismiss as command } from "@antumbra/domain-changes/commands/dismiss.ts";
import { dismiss as commandDecision } from "@antumbra/server-changes/logic/commands/dismiss.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const dismiss = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.dismiss")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeDismissed", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
