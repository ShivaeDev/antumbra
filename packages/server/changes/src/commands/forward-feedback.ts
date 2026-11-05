import type { forwardFeedback as command } from "@antumbra/domain-changes/commands/forward-feedback.ts";
import { forwardFeedback as commandDecision } from "@antumbra/server-changes/logic/commands/forward-feedback.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const forwardFeedback = (serial: Semaphore.Semaphore) =>
	Effect.fn("Changes.forwardFeedback")(
		function* (input: typeof command.Input.Type) {
			const history = yield* ChangesHistory;
			yield* history.checkRequest(input.requestId);
			const value = yield* commandDecision(input);
			return yield* history.append(input.requestId, [{ _tag: "ChangeFeedbackForwarded", ...value, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
