import { prepare as command } from "@antumbra/domain-changes/commands/prepare.ts";
import { prepare as commandDecision } from "@antumbra/server-changes/logic/commands/prepare.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const prepare = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.prepare")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangePrepared", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
