import type { refresh as command } from "@antumbra/domain-changes/commands/refresh.ts";
import { refresh as commandDecision } from "@antumbra/server-changes/logic/commands/refresh.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const refresh = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.refresh")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "ChangeRefreshRequested", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
