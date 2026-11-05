import type { choose as command } from "@antumbra/domain-role-settings/commands/choose.ts";
import { choose as commandDecision } from "@antumbra/server-role-settings/logic/commands/choose.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { RoleSettingsHistory } from "@antumbra/server-storage/role-settings/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const choose = (serial: Semaphore.Semaphore) =>
	Effect.fn("RoleSettings.choose")(
		function* (input: typeof command.Input.Type) {
			const history = yield* RoleSettingsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "RoleSettingChosen", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
