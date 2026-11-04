import { record as command } from "@antumbra/domain-inputs/commands/record.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const record = (serial: Semaphore.Semaphore) =>
	Effect.fn("Inputs.record")(function* (input: typeof command.Input.Type) {
		const history = yield* InputsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "InputRecorded", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
