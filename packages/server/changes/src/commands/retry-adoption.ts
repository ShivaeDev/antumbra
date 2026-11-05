import { retryAdoption as command } from "@antumbra/domain-changes/commands/retry-adoption.ts";
import { retryAdoption as commandDecision } from "@antumbra/server-changes/logic/commands/retry-adoption.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const retryAdoption = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.retryAdoption")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeAdoptionRetried", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
