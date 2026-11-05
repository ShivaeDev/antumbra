import type { failAdoption as command } from "@antumbra/domain-changes/commands/adoption-failed.ts";
import { failAdoption as commandDecision } from "@antumbra/server-changes/logic/commands/adoption-failed.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const failAdoption = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.failAdoption")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "ChangeAdoptionFailed", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
