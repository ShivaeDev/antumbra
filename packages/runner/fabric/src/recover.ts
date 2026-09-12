import { Effect } from "effect";
import { RunnerLog } from "#log.ts";

export const recover = Effect.fn("RunnerFabric.recover")(function* () {
	const log = yield* RunnerLog;
	const attached = new Set<string>();
	for (const { event } of yield* log.read(-1)) {
		switch (event.type) {
			case "SessionStarted":
			case "SessionWoke":
				attached.add(event.sessionId);
				break;
			case "SessionDetached":
			case "SessionSlept":
			case "SessionEnded":
				attached.delete(event.sessionId);
				break;
		}
	}
	for (const sessionId of attached) yield* log.append({ type: "SessionDetached", sessionId });
});
