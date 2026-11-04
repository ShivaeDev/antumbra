import { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { Effect } from "effect";
import { journalComparison } from "#test-support/journal-comparison.ts";

export const legacyInputSession = Effect.fn("PostgresApp.legacyInputSession")(function* () {
	const legacy = yield* journalComparison();
	const sessionId = SessionId.make("session:input-story");
	const runner = yield* legacy.runner({
		runnerId: "runner:input-story",
		logId: "log:input-story",
		backends: ["claude"],
		imageInputBackends: ["claude"],
	});
	yield* runner.append([
		{
			logId: "log:input-story",
			cursor: 1,
			at: 0,
			event: {
				type: "SessionStarted",
				requestId: "start:input-story",
				sessionId,
				agentId: "agent:input-story",
				backend: "claude",
				nativeRef: "native:input-story",
				cwd: "/input-story",
				toolSetVersion: "1",
				runnerId: "runner:input-story",
			},
		},
	]);
	return { legacy, runner, sessionId };
});
