import { finishSmoothing as command } from "@antumbra/domain-boards/commands/finish-smoothing.ts";
import { finishSmoothing as commandDecision } from "@antumbra/server-boards/logic/commands/finish-smoothing.ts";
import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const finishSmoothing = (serial: Semaphore.Semaphore) =>
	Effect.fn("Boards.finishSmoothing")(
		function* (input: typeof command.Input.Type) {
			const history = yield* BoardsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "SmoothingFinished", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
