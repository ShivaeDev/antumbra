import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

it.effect("recovers later durable Session demand after a lost wake", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Agent.create({
					charter: "recover bounded durable demand",
					currentSessionId: "session-later-demand",
					id: "agent-later-demand",
					role: "test hand",
					status: "alive",
				}).pipe(
					Effect.andThen(
						db.AgentSession.create({
							agentId: "agent-later-demand",
							backend: "scripted",
							charterDeliveredAt: new Date(1),
							createdAt: new Date(1),
							cwd: "/tmp/agent-later-demand",
							executionStatus: "active",
							id: "session-later-demand",
							nativeRef: "native-later-demand",
							parentSessionId: null,
							rootSessionId: "session-later-demand",
							status: "open",
						} satisfies NewAgentSession),
					),
				),
			);
			yield* TestClock.adjust(5_000);
			yield* Effect.yieldNow;
			expect(
				yield* db.Intent.where({ tag: "agent/recover" }).all(),
			).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
