import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Inputs } from "@antumbra/server-inputs/service.ts";
import { Effect } from "effect";
import { runnerInput } from "#adapters/inputs/runner-input.ts";
export const input = Effect.fn("Sessions.input")(function* (inputId: string, sessionId: string) {
	const inputsService = yield* Inputs;

	const stored = yield* inputsService.reading({ id: SessionInputId.make(inputId), sessionId }).pipe(Effect.orDie);
	if (stored === null) return yield* Effect.die(new Error(`Session input ${inputId} has not been committed`));
	return runnerInput(stored);
});
