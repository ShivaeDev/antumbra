import { requestAdoption as command } from "@antumbra/domain-changes/commands/request-adoption.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-journal/postgres/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const requestAdoption = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.requestAdoption")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* command.run(input, yield* history.rows(), command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeAdoptionRequested", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
