import { delivery as command } from "@antumbra/domain-inputs/commands/delivery.ts";
import { delivery as commandDecision } from "@antumbra/server-inputs/logic/commands/delivery.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const delivery = (serial: Semaphore.Semaphore) =>
	Effect.fn("Inputs.delivery")(
		function* (input: typeof command.Input.Type) {
			const history = yield* InputsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "InputDeliveryChanged", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
