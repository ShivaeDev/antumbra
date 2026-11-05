import { requestSmoothing as command } from "@antumbra/domain-boards/commands/request-smoothing.ts";
import { requestSmoothing as commandDecision } from "@antumbra/server-boards/logic/commands/request-smoothing.ts";
import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const requestSmoothing = (serial: Semaphore.Semaphore) =>
	Effect.fn("Boards.requestSmoothing")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BoardsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "BoardSmoothingRequested", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
