import { Clock, Effect } from "effect";
import { connectRunner, type LogEntry } from "#runner.ts";
import { nextSessionOperation } from "#test-support/next-session-operation.ts";

const registration = { runnerId: "smoothing-switch-runner", logId: "smoothing-switch-log", backends: ["claude"], imageInputBackends: [] };

export const smoothingRunner = Effect.fn("SmoothingRunner.connect")(function* () {
	const runner = yield* connectRunner(registration);
	const entries: LogEntry[] = [];
	return {
		summarizeNext: Effect.fn("SmoothingRunner.summarizeNext")(function* (text: string) {
			const start = yield* nextSessionOperation(runner, entries);
			if (start.type !== "Start") return yield* Effect.die("the smoother was not started");
			const at = yield* Clock.currentTimeMillis;
			const opened: LogEntry = {
				logId: registration.logId,
				cursor: entries.length,
				at,
				event: {
					type: "SessionStarted",
					requestId: start.requestId,
					sessionId: start.sessionId,
					agentId: start.options.agentId,
					backend: start.options.backend,
					cwd: start.options.cwd,
					nativeRef: start.sessionId,
					runnerId: registration.runnerId,
					toolSetVersion: start.options.toolSet.version,
				},
			};
			const accepted: LogEntry = {
				logId: registration.logId,
				cursor: entries.length + 1,
				at,
				event: { type: "InputAccepted", sessionId: start.sessionId, requestId: start.requestId, inputId: start.charter.id },
			};
			entries.push(opened, accepted);
			yield* runner.append([opened, accepted]);
			yield* runner.reply(start.requestId, { type: "Accepted" });
			const reply = yield* runner.tool({ sessionId: start.sessionId, callId: `summary:${start.sessionId}`, name: "write_summary", input: { text } });
			if (!reply.ok) return yield* Effect.die(new Error(reply.text));
			const stop = yield* nextSessionOperation(runner, entries);
			if (stop.type !== "Stop") return yield* Effect.die("the smoother was not stopped");
			const ended: LogEntry = {
				logId: registration.logId,
				cursor: entries.length,
				at: yield* Clock.currentTimeMillis,
				event: { type: "SessionEnded", requestId: stop.requestId, sessionId: stop.sessionId, reason: "summary received" },
			};
			entries.push(ended);
			yield* runner.append([ended]);
			yield* runner.reply(stop.requestId, { type: "Accepted" });
			return start;
		}),
	};
});
