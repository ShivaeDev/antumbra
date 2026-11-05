import { removeSupersession as command } from "@antumbra/domain-artifacts/commands/remove-supersession.ts";
import { removeSupersession as commandDecision } from "@antumbra/server-artifacts/logic/commands/remove-supersession.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const removeSupersession = (serial: Semaphore.Semaphore) =>
	Effect.fn("Artifacts.removeSupersession")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ArtifactsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ArtifactSupersessionRemoved", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
