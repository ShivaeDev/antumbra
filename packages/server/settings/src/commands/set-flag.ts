import { setFlag as command } from "@antumbra/domain-settings/commands/set-flag.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const setFlag = (serial: Semaphore.Semaphore) =>
	Effect.fn("Settings.setFlag")(function* (input: typeof command.Input.Type) {
		const history = yield* SettingsHistory;
		yield* history.checkRequest(input.requestId);
		const rows = yield* history.rows();
		const value = yield* command.run(input, rows, command.reject);
		return yield* history.append(input.requestId, [{ _tag: "FlagSet", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
