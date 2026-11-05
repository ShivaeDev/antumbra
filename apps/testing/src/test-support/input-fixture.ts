import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { append } from "@antumbra/server/runner/append.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { Effect } from "effect";

export const inputSession = Effect.fn("PostgresApp.inputSession")(function* () {
	const sessionId = SessionId.make("session:input-story");
	yield* (yield* Backends).observeCapability({ requestId: Request.make("input-image-support"), backend: "claude", imageInput: true });
	yield* append({
		logId: "log:input-story",
		entries: [
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
		],
	});
	return { sessionId };
});
