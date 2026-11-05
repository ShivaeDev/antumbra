import { setCount as command } from "@antumbra/domain-settings/commands/set-count.ts";
import { setCount as commandDecision } from "@antumbra/server-settings/logic/commands/set-count.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const setCount = (serial: Semaphore.Semaphore) =>
	Effect.fn("Settings.setCount")(
		function* (input: typeof command.Input.Type) {
			const history = yield* SettingsHistory;
			yield* history.checkRequest(input.requestId);

			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "CountSet", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
