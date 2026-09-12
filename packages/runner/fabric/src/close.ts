import { Effect, Exit, Scope } from "effect";
import type { State } from "#state.ts";

export const close = Effect.fn("RunnerFabric.close")(function* (state: State, sessionId: string) {
	const entry = state.attachments.get(sessionId);
	if (entry === undefined) return;
	state.attachments.delete(sessionId);
	yield* Scope.close(entry.scope, Exit.void);
});
