import { finishSmoothingSession as command } from "@antumbra/domain-boards/commands/finish-smoothing-session.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const finishSmoothingSession = (serial: Semaphore.Semaphore) =>
	Effect.fn("Boards.finishSmoothingSession")(function* (input: typeof command.Input.Type) {
		const history = yield* BoardsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "SmoothingSessionFinished", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
