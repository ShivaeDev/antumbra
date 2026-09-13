import { eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";

const raw = { source: "codex", kind: "event", payload: "{}" };
const turnId = SessionId.make("turn-session");

const turning = (cursor: number, event: AgentEvent): LogEntry => ({
	logId: "turn-log",
	cursor,
	at: 100 + cursor,
	event: { type: "ProviderEvent", observation: "live", sessionId: turnId, event },
});

it.app("a turn's numbers stand once, beside the turn, and an allowed rate limit is a session fact", function* () {
	const runner = yield* connectRunner({ runnerId: "turn-runner", logId: "turn-log", backends: ["codex"], imageInputBackends: [] });
	const entries: LogEntry[] = [
		{
			logId: "turn-log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				requestId: "turn-start",
				sessionId: turnId,
				agentId: "turn-agent",
				backend: "codex",
				nativeRef: "turn-native",
				cwd: "/berth",
				toolSetVersion: "tools",
				runnerId: "turn-runner",
			},
		},
		turning(1, {
			type: "usage",
			byModel: [{ cacheReadTokens: 138_093, cacheWriteTokens: 6_087, costUsd: 0.2538, inputTokens: 130, model: "gpt-6-astra", outputTokens: 1_925 }],
			cacheReadTokens: 138_093,
			cacheWriteTokens: 6_087,
			costUsd: 0.2538,
			cumulativeCostUsd: 0.7412,
			inputTokens: 130,
			outputTokens: 1_925,
			raw,
		}),
		turning(2, { type: "turn.completed", status: "completed", durationMs: 38_100, raw }),
		turning(3, { type: "rate.limit", status: "allowed", windows: [{ durationMinutes: 10_080, usedPercent: 0 }], raw }),
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
	const reading = yield* eventually(
		rpc("sessions.transcript", { id: turnId }),
		(held) => held.standing.rateLimit !== undefined,
		"the transcript's standing rate limit to be set",
	);
	const telemetry = reading.items.filter((item) => item.kind === "telemetry");
	expect(telemetry).toHaveLength(1);
	expect(telemetry[0]).toMatchObject({
		detail: "cache read 138,093 · cache write 6,087 · session $0.7412 so far",
		label: "turn completed · gpt-6-astra · 38.1s · $0.2538 · 96% cache · in 130 · out 1,925",
	});
	expect(reading.standing.rateLimit).toBe("0% of 7d window");
	expect(reading.standing.turn.costUsd).toBeCloseTo(0.2538, 6);
	expect(reading.standing.tokens).toEqual({ cacheReadTokens: 138_093, cacheWriteTokens: 6_087, inputTokens: 130, outputTokens: 1_925 });
});
