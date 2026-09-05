import { SessionRestart } from "@antumbra/sessions/restart/service";
import { Effect } from "effect";
import { KernelReach } from "#kernel-reach/service.ts";

export const honorRestartIntent = Effect.gen(function* () {
	const restart = yield* SessionRestart;
	const reach = yield* KernelReach;
	for (const sessionId of yield* restart.consume()) {
		yield* reach.submitWake({ sessionId });
	}
});
