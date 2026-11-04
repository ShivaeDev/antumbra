import { observe as command } from "@antumbra/domain-changes/commands/observe.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-journal/postgres/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const observe = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.observe")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* command.run(input, yield* history.rows(), command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeObserved", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
