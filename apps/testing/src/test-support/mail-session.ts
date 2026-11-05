import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { append } from "@antumbra/server/runner/append.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Settings } from "@antumbra/server-settings/service.ts";
import { Effect } from "effect";

export const mailSession = Effect.fn("PostgresApp.mailSession")(function* () {
	const requestId = Request.make("mail-story");
	const { agentId, sessionId } = identity(requestId);
	yield* (yield* Agents).spawn({ requestId, role: "hand", backend: "claude", model: null, effort: null });
	yield* (yield* Settings).setCount({ requestId: Request.make("mail-window"), key: "routineMailMinutes", count: 1 });
	const base = { logId: "mail-story", at: 0 };
	yield* append({
		logId: base.logId,
		entries: [
			{
				...base,
				cursor: 0,
				event: {
					type: "SessionStarted",
					requestId,
					sessionId,
					agentId,
					backend: "claude",
					cwd: "/mail-story",
					nativeRef: "native",
					runnerId: "runner",
					toolSetVersion: "1",
				},
			},
			{ ...base, cursor: 1, event: { type: "InputAccepted", requestId, sessionId, inputId: "charter" } },
			{
				...base,
				cursor: 2,
				event: {
					type: "ProviderEvent",
					sessionId,
					observation: "live",
					event: { type: "turn.completed", status: "completed", raw: { source: "scripted", kind: "turn.completed", payload: "{}" } },
				},
			},
		],
	});
	return { agentId, sessionId };
});
