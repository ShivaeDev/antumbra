import { choose as command } from "@antumbra/domain-role-settings/commands/choose.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const choose = (serial: Semaphore.Semaphore) =>
	Effect.fn("RoleSettings.choose")(function* (input: typeof command.Input.Type) {
		const history = yield* RoleSettingsHistory;
		yield* history.checkRequest(input.requestId);
		const rows = yield* history.rows();
		const value = yield* command.run(input, rows, command.reject);
		return yield* history.append(input.requestId, [{ _tag: "RoleSettingChosen", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
