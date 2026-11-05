import { legacyFacts } from "@antumbra/app-testing/legacy.ts";
import { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { expect } from "vitest";

const SESSION = SessionId.make("session-1");

const started = {
	name: "SessionObserved",
	subject: SESSION,
	payload: {
		sessionId: SESSION,
		live: true,
		nodeRef: null,
		origin: null,
		operationId: null,
		evidence: {
			type: "started",
			agentId: "agent-1",
			backend: "codex",
			cwd: "/berth",
			nativeRef: "native-1",
			runnerId: "runner-1",
			toolSetVersion: "tools",
		},
	},
};

const TOKENS = { cacheReadTokens: 40_000, cacheWriteTokens: 10_000, inputTokens: 50_000, outputTokens: 20_000 };

const spent = (model: string, cost: Record<string, number>) => ({
	...TOKENS,
	byModel: [{ ...TOKENS, model, ...cost }],
	...cost,
});

const turnOn = (model: string, cost: Record<string, number> = {}) => ({
	name: "SessionProviderEvent",
	subject: null,
	payload: { sessionId: SESSION, logId: "log-1", cursor: 1, observedAt: 200, origin: null, usage: spent(model, cost) },
});

legacyFacts.it("replays an unpriced legacy turn on a listed model with its list price", [], function* ({ seed, usage }) {
	yield* seed([started, turnOn("gpt-6-astra")]);
	expect(yield* usage(SESSION)).toMatchObject({ usage: { byModel: [{ costUsd: 1.665, model: "gpt-6-astra" }], costUsd: 1.665 } });
});
legacyFacts.it("keeps an unlisted legacy model unpriced", [], function* ({ seed, usage }) {
	yield* seed([started, turnOn("gpt-6-astra-safe")]);
	const row = yield* usage(SESSION);
	expect(row).toMatchObject({ usage: { byModel: [{ model: "gpt-6-astra-safe" }] } });
	expect(row).not.toHaveProperty("usage.costUsd");
	expect(row).not.toHaveProperty("usage.byModel.0.costUsd");
});
legacyFacts.it("preserves the price a legacy backend already reported", [], function* ({ seed, usage }) {
	yield* seed([started, turnOn("gpt-6-astra", { costUsd: 0.5 })]);
	expect(yield* usage(SESSION)).toMatchObject({ usage: { byModel: [{ costUsd: 0.5, model: "gpt-6-astra" }], costUsd: 0.5 } });
});
