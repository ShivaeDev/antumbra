import { supersede as command } from "@antumbra/domain-artifacts/commands/supersede.ts";
import { supersede as commandDecision } from "@antumbra/server-artifacts/logic/commands/supersede.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const supersede = (serial: Semaphore.Semaphore) =>
	Effect.fn("Artifacts.supersede")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ArtifactsHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ArtifactSuperseded", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
