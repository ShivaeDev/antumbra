import { removeSupersession as command } from "@antumbra/domain-artifacts/commands/remove-supersession.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const removeSupersession = (serial: Semaphore.Semaphore) =>
	Effect.fn("Artifacts.removeSupersession")(function* (input: typeof command.Input.Type) {
		const history = yield* ArtifactsHistory;
		yield* history.checkRequest(input.requestId);
		const value = yield* command.run(input, yield* history.rows(), command.reject);
		return yield* history.append(input.requestId, [{ _tag: "ArtifactSupersessionRemoved", ...value, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
