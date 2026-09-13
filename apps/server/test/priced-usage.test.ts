import { definition } from "@antumbra/app-testing/entry.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { codecOf, registryOf } from "@antumbra/server-journal/app.ts";
import { Database } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { readHandle } from "@antumbra/server-journal/read-handle.ts";
import { start } from "@antumbra/server-journal/startup.ts";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";

const JOURNAL = `CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;

const SESSION = "session-1";

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

const seeded = (...facts: readonly { readonly name: string; readonly subject: string | null; readonly payload: Record<string, unknown> }[]) =>
	Effect.gen(function* () {
		const { write: sql } = yield* Database;
		yield* sql.unsafe(JOURNAL);
		const entries: Record<string, unknown>[] = [];
		for (const fact of facts) {
			const seq = entries.length + 1;
			entries.push({
				at: 100 + seq,
				name: fact.name,
				payload: JSON.stringify(fact.payload),
				requestId: `request-${seq}`,
				seq,
				subject: fact.subject,
			});
		}
		yield* sql`INSERT INTO "journal" ${sql.insert(entries)}`;
	}).pipe(Effect.orDie);

const booted = Effect.gen(function* () {
	const database = yield* Database;
	const registry = yield* registryOf(definition);
	yield* start(database.write, registry, Effect.void);
	const rows = readHandle(database.read, codecOf(registry, sessionUsage));
	return yield* rows.where({ sessionId: SESSION });
});

it.effect("an unpriced turn on a listed model boots into a priced row", () =>
	Effect.gen(function* () {
		yield* seeded(started, turnOn("gpt-6-astra"));
		const [row] = yield* booted;
		expect(row).toMatchObject({ usage: { byModel: [{ costUsd: 1.665, model: "gpt-6-astra" }], costUsd: 1.665 } });
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a turn on a model the list does not name is left as it was", () =>
	Effect.gen(function* () {
		yield* seeded(started, turnOn("gpt-6-astra-safe"));
		const [row] = yield* booted;
		expect(row).toMatchObject({ usage: { byModel: [{ model: "gpt-6-astra-safe" }] } });
		expect(row).not.toHaveProperty("usage.costUsd");
		expect(row).not.toHaveProperty("usage.byModel.0.costUsd");
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a turn that already carries a cost keeps the one the backend reported", () =>
	Effect.gen(function* () {
		yield* seeded(started, turnOn("gpt-6-astra", { costUsd: 0.5 }));
		const [row] = yield* booted;
		expect(row).toMatchObject({ usage: { byModel: [{ costUsd: 0.5, model: "gpt-6-astra" }], costUsd: 0.5 } });
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
