import { register as command } from "@antumbra/domain-repos/commands/register.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const register = (serial: Semaphore.Semaphore) =>
	Effect.fn("Repos.register")(function* (input: typeof command.Input.Type) {
		const history = yield* ReposHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "RepoRegistered", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
