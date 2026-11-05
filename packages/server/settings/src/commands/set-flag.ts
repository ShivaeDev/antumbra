import type { setFlag as command } from "@antumbra/domain-settings/commands/set-flag.ts";
import { setFlag as commandDecision } from "@antumbra/server-settings/logic/commands/set-flag.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const setFlag = (serial: Semaphore.Semaphore) =>
	Effect.fn("Settings.setFlag")(
		function* (input: typeof command.Input.Type) {
			const history = yield* SettingsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "FlagSet", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
