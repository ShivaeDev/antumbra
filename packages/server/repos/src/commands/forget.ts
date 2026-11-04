import { forget as command } from "@antumbra/domain-repos/commands/forget.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const forget = (serial: Semaphore.Semaphore) =>
	Effect.fn("Repos.forget")(function* (input: typeof command.Input.Type) {
		const history = yield* ReposHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "RepoForgotten", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
