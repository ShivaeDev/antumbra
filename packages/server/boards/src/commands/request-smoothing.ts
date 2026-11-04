import { requestSmoothing as command } from "@antumbra/domain-boards/commands/request-smoothing.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const requestSmoothing = (serial: Semaphore.Semaphore) =>
	Effect.fn("Boards.requestSmoothing")(function* (input: typeof command.Input.Type) {
		const history = yield* BoardsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "BoardSmoothingRequested", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
