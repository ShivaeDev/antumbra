import { delivery as command } from "@antumbra/domain-inputs/commands/delivery.ts";
import { withExecutionWrite } from "@antumbra/server-journal/postgres/execution/boundary.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const delivery = (serial: Semaphore.Semaphore) =>
	Effect.fn("Inputs.delivery")(
		function* (input: typeof command.Input.Type) {
			const history = yield* InputsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* command.run(input, yield* history.rows(), command.reject);
			return yield* history.append(input.requestId, [{ _tag: "InputDeliveryChanged", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
