import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import {
	eventually,
	payload,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";

const HELD: SpawnFields = {
	agentId: "agent-held",
	backend: "scripted",
	charter: "keep the watch this process is holding",
	role: "hand",
	runner: "local",
	sessionId: "session-held",
};

// why: a pass on demand rather than on the clock — the question these tests ask
// is what the sweep finds, not how long it waits between sweeps.
const recoveryPass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find(
		({ tag }) => tag === "agent/recover",
	);
	if (demand === undefined) {
		return yield* Effect.die("the domain registered no recovery demand");
	}
	yield* demand.pass;
});

const recoveries = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/recover" }).all();
});

const executionStatusOf = (sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(
			yield* db.AgentSession.where({ id: sessionId }).first(),
		).executionStatus;
	});

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

// why: the row says a live execution is running and it is telling the truth —
// this process is holding the attachment that makes it so. Recovery is for the
// rows that outlived their process, and demanding it here would ask every pass
// for a resume that has nothing to resume.
it.live("leaves a Session this process is holding out of recovery demand", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.spawn, HELD);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			expect((yield* domain.sessionsAttached).has(HELD.sessionId)).toBe(true);
			expect(yield* executionStatusOf(HELD.sessionId)).toBe("active");
			yield* recoveryPass;
			yield* recoveryPass;
			expect(yield* recoveries).toHaveLength(0);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: the demand has to converge on its own recovery. The row still says
// active after the rebuild — nothing in a resume moves it — so a sweep that
// read the row would ask again every pass for as long as the Agent worked.
it.live("stops demanding recovery once the rebuild has the Session back", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const backend = reportsNativeRef(
			scripted.backend,
			scripted,
			"native-durable",
		);
		yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* eventually(
				Effect.gen(function* () {
					const attached = yield* domain.sessionsAttached;
					expect(yield* scripted.opened).toHaveLength(2);
					expect(attached.has(payload.sessionId)).toBe(true);
				}),
			);
			expect(yield* executionStatusOf(payload.sessionId)).toBe("active");
			yield* recoveryPass;
			yield* recoveryPass;
			expect(yield* recoveries).toHaveLength(1);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, backend, {}, recorded.runner),
			),
		);
	}),
);
