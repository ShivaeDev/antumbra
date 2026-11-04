import { archive as command } from "@antumbra/domain-changes/commands/archive.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-journal/postgres/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const archive = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.archive")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* command.run(input, yield* history.rows(), command.reject);
			return yield* history.append(input.requestId, [{ _tag: "ChangeArchived", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
