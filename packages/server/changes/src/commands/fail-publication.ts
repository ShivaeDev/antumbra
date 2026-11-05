import type { failPublication as command } from "@antumbra/domain-changes/commands/publication-failed.ts";
import { failPublication as commandDecision } from "@antumbra/server-changes/logic/commands/publication-failed.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const failPublication = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.failPublication")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "ChangePublicationFailed", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
