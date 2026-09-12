import { answered, it } from "@antumbra/app-testing/entry.ts";
import { lifecycleClient } from "@antumbra/app-testing/lifecycle.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const registration = { runnerId: "runner", logId: "lifecycle-proof", backends: ["claude"], imageInputBackends: [] };

const started = (name: string, runnerId: string): LogEntry["event"] => ({
	type: "SessionStarted",
	sessionId: name,
	requestId: `start-${name}`,
	agentId: name,
	backend: "claude",
	cwd: "/berth",
	nativeRef: name,
	runnerId,
	toolSetVersion: "v1",
});

it.app("records running roots on connected runners and abandons the requested wake list", function* (app) {
	const runner = yield* connectRunner(registration);
	const lifecycle = yield* lifecycleClient;
	let cursor = 0;
	const entries: LogEntry[] = [];
	for (const name of ["active", "idle", "asleep"]) {
		const source = { logId: registration.logId, at: 100 };
		entries.push({ ...source, cursor: cursor++, event: started(name, registration.runnerId) });
		if (name !== "idle")
			entries.push({
				...source,
				cursor: cursor++,
				event: { type: "InputAccepted", sessionId: name, requestId: `start-${name}`, inputId: `charter-${name}` },
			});
		if (name === "asleep") entries.push({ ...source, cursor: cursor++, event: { type: "SessionSlept", sessionId: name, requestId: "sleep" } });
	}
	yield* runner.append(entries);
	yield* Effect.scoped(
		Effect.gen(function* () {
			const gone = yield* connectRunner({ ...registration, runnerId: "gone", logId: "gone-log" });
			yield* gone.append([
				{ logId: "gone-log", at: 100, cursor: 0, event: started("disconnected", "gone") },
				{
					logId: "gone-log",
					at: 100,
					cursor: 1,
					event: { type: "InputAccepted", sessionId: "disconnected", requestId: "start-disconnected", inputId: "charter-disconnected" },
				},
			]);
		}),
	);
	yield* lifecycle("restart.record", { requestId: "record" });
	expect(yield* answered(app.api.lifecycle.pending({}))).toEqual(["active"]);
	yield* lifecycle("restart.abandon", { requestId: "abandon" });
	expect(yield* answered(app.api.lifecycle.pending({}))).toBeNull();
});

it.app("ordinary shutdown waits for the runner to acknowledge drain", function* () {
	const runner = yield* connectRunner(registration);
	const lifecycle = yield* lifecycleClient;
	const drained = yield* Effect.forkChild(lifecycle("restart.drain", { requestId: "quit" }));
	const operation = yield* runner.next;
	expect(operation).toEqual({ type: "Drain", requestId: "quit:runner" });
	expect(drained.pollUnsafe()).toBeUndefined();
	yield* runner.reply(operation.requestId, { type: "Accepted" });
	yield* Fiber.join(drained);
});
