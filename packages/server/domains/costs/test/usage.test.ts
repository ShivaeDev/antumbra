import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
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
				observation: "live",
				sessionId: "cost-session",
				event: {
					type: "usage",
					byModel: [{ inputTokens: 10, outputTokens: 20, costUsd: 0.1, model: "model-a" }],
					inputTokens: 10,
					outputTokens: 20,
					costUsd: 0.1,
					cumulativeCostUsd: 50,
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
				observation: "live",
				sessionId: "cost-session",
				event: {
					type: "usage",
					byModel: [{ inputTokens: 30, outputTokens: 40, cacheReadTokens: 5, model: "model-b" }],
					inputTokens: 30,
					outputTokens: 40,
					cacheReadTokens: 5,
					origin: { node: "child", spawnedBy: "spawn" },
					raw: { source: "codex", kind: "usage", payload: "{}" },
				},
			},
		},
	];
	yield* runner.append(entries);
	const total = yield* answered(app.api.costs.forAgent({ agentId: "cost-agent" }), "the agent's cost total to be read");
	expect(total).toMatchObject({ turns: 2, inputTokens: 40, outputTokens: 60, cacheReadTokens: 5, costUsd: 0.1, costPartial: true });
	const costs = yield* answered(app.api.costs.reading({ today: "1970-01-01" }), "the cost reading to render");
	expect(costs.total).toEqual(total);
	expect(costs.unassigned).toEqual(total);
	expect(costs.agents).toMatchObject([{ agentId: "cost-agent", sessionIds: ["cost-session", "cost-session:child"] }]);
	expect(costs.models.find((model) => model.model === "model-b")?.total).toMatchObject({ costUsd: null, costPartial: false });
});

it.app("a session that ran two models is two rows of spend, and its own model is untouched", function* (app) {
	const requested = Request.make("spend");
	const { agentId, sessionId } = identity(requested);
	const runner = yield* connectRunner({ runnerId: "spend-runner", logId: "spend-log", backends: ["codex"], imageInputBackends: [] });
	yield* app.api.agents.spawn({ requestId: requested, role: "crew", backend: "codex", model: "gpt-6-astra", effort: null });
	const plan = yield* runner.next;
	yield* runner.reply(plan.requestId, { type: "MooragePlanned", plan: { root: "/berth", berths: [] } });
	const provision = yield* runner.next;
	yield* runner.reply(provision.requestId, { type: "Accepted" });
	const start = yield* runner.next;
	expect(start).toMatchObject({ type: "Start", options: { model: "gpt-6-astra" } });
	yield* runner.reply(start.requestId, { type: "Accepted" });
	yield* runner.append([
		{
			logId: "spend-log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				requestId: start.requestId,
				sessionId,
				agentId,
				backend: "codex",
				nativeRef: "native",
				cwd: "/berth",
				toolSetVersion: "crew-v1",
				runnerId: "spend-runner",
			},
		},
		{
			logId: "spend-log",
			cursor: 1,
			at: 101,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: {
					type: "usage",
					byModel: [{ inputTokens: 10, outputTokens: 20, model: "gpt-6-astra" }],
					inputTokens: 10,
					outputTokens: 20,
					raw: { source: "codex", kind: "thread/tokenUsage/updated", payload: "{}" },
				},
			},
		},
	]);
	const first = yield* answered(app.api.costs.reading({ today: "1970-01-01" }), "the cost reading to render");
	expect(first.models).toMatchObject([{ model: "gpt-6-astra", total: { inputTokens: 10, outputTokens: 20, turns: 1 } }]);
	yield* runner.append([
		{
			logId: "spend-log",
			cursor: 2,
			at: 102,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: {
					type: "model.rerouted",
					model: "gpt-6-astra-safe",
					reason: "highRiskCyberActivity",
					raw: { source: "codex", kind: "model/rerouted", payload: "{}" },
				},
			},
		},
		{
			logId: "spend-log",
			cursor: 3,
			at: 103,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId,
				event: {
					type: "usage",
					byModel: [{ inputTokens: 4, outputTokens: 6, model: "gpt-6-astra-safe" }],
					inputTokens: 4,
					outputTokens: 6,
					raw: { source: "codex", kind: "thread/tokenUsage/updated", payload: "{}" },
				},
			},
		},
	]);
	const costs = yield* eventually(
		app.api.costs.reading({ today: "1970-01-01" }),
		(reading) => reading.models.length === 2,
		"two models of spend in the cost reading",
	);
	expect(costs.models.map((spent) => spent.model).toSorted()).toEqual(["gpt-6-astra", "gpt-6-astra-safe"]);
	expect(costs.total).toMatchObject({ inputTokens: 14, outputTokens: 26, turns: 2 });
	expect(yield* answered(app.api.agents.birthBySession({ sessionId }), "the birth to be read")).toMatchObject({ model: "gpt-6-astra" });
});

it.app("counts no turn for one that named no model, and one turn for a model its breakdown names twice", function* (app) {
	const runner = yield* connectRunner({ runnerId: "count-runner", logId: "count-log", backends: ["claude"], imageInputBackends: [] });
	const raw = { source: "claude", kind: "result/success", payload: "{}" };
	yield* runner.append([
		{
			logId: "count-log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				requestId: "count-start",
				sessionId: "count-session",
				agentId: "count-agent",
				backend: "claude",
				nativeRef: "native",
				cwd: "/berth",
				toolSetVersion: "tools",
				runnerId: "count-runner",
			},
		},
		{
			logId: "count-log",
			cursor: 1,
			at: 101,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId: "count-session",
				event: { type: "usage", byModel: [], inputTokens: 0, outputTokens: 0, costUsd: 0, raw },
			},
		},
		{
			logId: "count-log",
			cursor: 2,
			at: 102,
			event: {
				type: "ProviderEvent",
				observation: "live",
				sessionId: "count-session",
				event: {
					type: "usage",
					byModel: [
						{ inputTokens: 10, outputTokens: 2, model: "claude-opus-5" },
						{ inputTokens: 4, outputTokens: 1, model: "claude-opus-5" },
					],
					inputTokens: 14,
					outputTokens: 3,
					raw,
				},
			},
		},
	]);
	expect(yield* answered(app.api.costs.forAgent({ agentId: "count-agent" }), "the agent's cost total to be read")).toMatchObject({
		inputTokens: 14,
		outputTokens: 3,
		turns: 1,
	});
	const costs = yield* answered(app.api.costs.reading({ today: "1970-01-01" }), "the cost reading to render");
	expect(costs.models).toMatchObject([{ model: "claude-opus-5", total: { inputTokens: 14, outputTokens: 3, turns: 1 } }]);
});
