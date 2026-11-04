import { write as command } from "@antumbra/domain-boards/commands/write.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const write = (serial: Semaphore.Semaphore) =>
	Effect.fn("Boards.write")(function* (input: typeof command.Input.Type) {
		const history = yield* BoardsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "NoteWritten", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
