import { record as command } from "@antumbra/domain-inputs/commands/record.ts";
import { record as commandDecision } from "@antumbra/server-inputs/logic/commands/record.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const record = (serial: Semaphore.Semaphore) =>
	Effect.fn("Inputs.record")(
		function* (input: typeof command.Input.Type) {
			const history = yield* InputsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "InputRecorded", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
