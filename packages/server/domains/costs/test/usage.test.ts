import { answered, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { expect } from "vitest";

it.app("includes delegated usage and preserves unreported costs", function* (app) {
	const runner = yield* connectRunner({ runnerId: "cost-runner", logId: "cost-log", backends: ["codex"], imageInputBackends: [] });
	const entries: LogEntry[] = [
		{
			logId: "cost-log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				requestId: "start",
				sessionId: "cost-session",
				agentId: "cost-agent",
				backend: "codex",
				nativeRef: "native",
				cwd: "/berth",
				toolSetVersion: "tools",
				runnerId: "cost-runner",
			},
		},
		{
			logId: "cost-log",
			cursor: 1,
			at: 101,
			event: {
				type: "ProviderEvent",
				sessionId: "cost-session",
				event: {
					type: "usage",
					inputTokens: 10,
					outputTokens: 20,
					costUsd: 0.1,
					cumulativeCostUsd: 50,
					model: "model-a",
					raw: { source: "codex", kind: "usage", payload: "{}" },
				},
			},
		},
		{
			logId: "cost-log",
			cursor: 2,
			at: 102,
			event: {
				type: "ProviderEvent",
				sessionId: "cost-session",
				event: {
					type: "usage",
					inputTokens: 30,
					outputTokens: 40,
					cacheReadTokens: 5,
					origin: { node: "child", spawnedBy: "spawn" },
					model: "model-b",
					raw: { source: "codex", kind: "usage", payload: "{}" },
				},
			},
		},
	];
	yield* runner.append(entries);
	const total = yield* answered(app.api.costs.forAgent({ agentId: "cost-agent" }));
	expect(total).toMatchObject({ turns: 2, inputTokens: 40, outputTokens: 60, cacheReadTokens: 5, costUsd: 0.1, costPartial: true });
	const costs = yield* answered(app.api.costs.reading({ today: "1970-01-01" }));
	expect(costs.total).toEqual(total);
	expect(costs.unassigned).toEqual(total);
	expect(costs.agents).toMatchObject([{ agentId: "cost-agent", sessionIds: ["cost-session", "cost-session:child"] }]);
	expect(costs.models.find((model) => model.model === "model-b")?.total).toMatchObject({ costUsd: null, costPartial: false });
});
