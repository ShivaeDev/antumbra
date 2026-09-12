import { reading } from "@antumbra/domain-inputs/queries/reading.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { runnerInput } from "#adapters/inputs/runner-input.ts";
export const input = Effect.fn("Sessions.input")(function* (inputId: string, sessionId: string) {
	const live = yield* Live;
	const stored = yield* live.read(reading, { id: SessionInputId.make(inputId), sessionId });
	if (stored === null) return yield* Effect.die(new Error(`Session input ${inputId} has not been committed`));
	return runnerInput(stored);
});
