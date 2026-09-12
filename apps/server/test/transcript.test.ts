import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { TranscriptReading, TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect, Schema, Stream } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";

const raw = { source: "codex", kind: "event", payload: "{}" };
const sessionId = SessionId.make("transcript-session");
const started: LogEntry = {
	logId: "transcript-log",
	cursor: 0,
	at: 100,
	event: {
		type: "SessionStarted",
		requestId: "start",
		sessionId,
		agentId: "transcript-agent",
		backend: "codex",
		nativeRef: "native",
		cwd: "/berth",
		toolSetVersion: "tools",
		runnerId: "transcript-runner",
	},
};

it.app("streams runner evidence and retains usage after raw events expire", function* (app) {
	const runner = yield* connectRunner({ runnerId: "transcript-runner", logId: "transcript-log", backends: ["codex"], imageInputBackends: [] });
	const entries: LogEntry[] = [
		started,
		{
			logId: "transcript-log",
			cursor: 1,
			at: 101,
			event: { type: "ProviderEvent", observation: "live", sessionId, event: { type: "message", role: "agent", text: "Hello", raw } },
		},
		{
			logId: "transcript-log",
			cursor: 2,
			at: 102,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: { type: "tool.started", toolId: "shell", name: "shell", input: "pwd", raw },
			},
		},
		{
			logId: "transcript-log",
			cursor: 3,
			at: 103,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: { type: "tool.completed", toolId: "shell", ok: true, output: "/berth", raw },
			},
		},
		{
			logId: "transcript-log",
			cursor: 4,
			at: 104,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: { type: "usage", inputTokens: 10, outputTokens: 20, costUsd: 0.01, cumulativeCostUsd: 50, raw },
			},
		},
	];
	yield* Effect.forkScoped(
		Effect.forever(
			Effect.gen(function* () {
				const operation = yield* runner.next;
				const result =
					operation.type === "ReadLog"
						? { type: "LogRead" as const, entries: entries.filter((entry) => entry.cursor > operation.after) }
						: { type: "Accepted" as const };
				yield* runner.reply(operation.requestId, result);
			}),
		),
	);
	yield* runner.append(entries);
	const rpc = yield* RpcTest.makeClient(TranscriptRpc.middleware(Token), { flatten: true });
	const updates = yield* Stream.toQueue(rpc("transcript.follow", { id: sessionId }), { capacity: "unbounded" });
	const initial = yield* eventually(Stream.fromQueue(updates), (reading) =>
		reading.items.some((item) => item.kind === "tool" && item.result === "/berth"),
	);
	const json = JSON.stringify(Schema.encodeSync(TranscriptReading)(initial));
	expect(Schema.decodeUnknownSync(TranscriptReading)(JSON.parse(json))).toMatchObject({
		items: expect.arrayContaining([expect.objectContaining({ kind: "message", text: "Hello" })]),
		activity: { live: initial.activity.live },
	});
	expect(initial.items.filter((item) => item.kind === "tool")).toHaveLength(1);
	expect(initial.items).toContainEqual(expect.objectContaining({ kind: "message", text: "Hello" }));
	const future: LogEntry = {
		logId: "transcript-log",
		cursor: 5,
		at: 105,
		event: {
			type: "ProviderEvent",
			observation: "live",
			sessionId,
			event: { type: "raw", raw: { source: "codex", kind: "future_kind", payload: '{"future":true}' } },
		},
	};
	entries.push(future);
	yield* runner.append([future]);
	const refreshed = yield* eventually(Stream.fromQueue(updates), (reading) => reading.items.some((item) => item.kind === "raw"));
	expect(refreshed.items).toContainEqual(expect.objectContaining({ kind: "raw", payload: '{"future":true}' }));
	expect(yield* answered(app.api.costs.forAgent({ agentId: "transcript-agent" }))).toMatchObject({
		turns: 1,
		inputTokens: 10,
		outputTokens: 20,
		costUsd: 0.01,
		costPartial: false,
	});
	entries.splice(0);
	const retained = yield* answered(rpc("transcript.follow", { id: sessionId }));
	expect(retained.items).toEqual([]);
	expect(retained.unavailable).not.toEqual([]);
	expect(yield* answered(app.api.costs.forAgent({ agentId: "transcript-agent" }))).toMatchObject({
		turns: 1,
		inputTokens: 10,
		outputTokens: 20,
		costUsd: 0.01,
	});
});
