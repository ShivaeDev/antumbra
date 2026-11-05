import { freeze as command } from "@antumbra/domain-changes/commands/freeze.ts";
import { freeze as commandDecision } from "@antumbra/server-changes/logic/commands/freeze.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const freeze = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.freeze")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeProposalFrozen", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
