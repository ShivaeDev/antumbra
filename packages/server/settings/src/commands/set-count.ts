import { setCount as command } from "@antumbra/domain-settings/commands/set-count.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const setCount = (serial: Semaphore.Semaphore) =>
	Effect.fn("Settings.setCount")(function* (input: typeof command.Input.Type) {
		const history = yield* SettingsHistory;
		yield* history.checkRequest(input.requestId);
		const rows = yield* history.rows();
		const value = yield* command.run(input, rows, command.reject);
		return yield* history.append(input.requestId, [{ _tag: "CountSet", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
