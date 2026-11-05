import { adopt as command } from "@antumbra/domain-changes/commands/adopt.ts";
import { adopt as commandDecision } from "@antumbra/server-changes/logic/commands/adopt.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const adopt = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.adopt")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeAdopted", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
