import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	standDown,
} from "#test/harness.ts";
import { born, chartered, handFor } from "#test/retire-crew-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const HAND = "agent-guarded";
const STRANDED = "agent-stranded";

const retiring = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.retire, { agentId });
		const status = yield* untilTerminal(submission.changes);
		const intent = yield* db.Intent.where({ id: submission.id }).first();
		return { detail: Option.getOrThrow(intent).detail, status };
	});

// why: the button and the sweep both read a moment that had already passed, so
// the act asks again as it runs. An agent mid-turn is work that ending it would
// sever, and the refusal names itself rather than failing quietly.
it.live("retiring an agent that is working refuses by name", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { pieceId, voyageId } = yield* chartered;
			yield* born(handFor(HAND, pieceId, voyageId));

			const refused = yield* retiring(HAND);

			expect(refused.status).toBe("failed");
			expect(refused.detail).toContain("is working in session");
			const agent = yield* db.Agent.where({ id: HAND }).first();
			expect(Option.getOrThrow(agent).status).toBe("alive");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: the same agent, one farewell later. Nothing about the record changed
// except that it said it had nothing left to do — which is the whole of what
// the guard asks.
it.live("retiring an agent that has stood down is allowed through", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { pieceId, voyageId } = yield* chartered;
			yield* born(handFor(HAND, pieceId, voyageId));
			yield* standDown(scripted, HAND);

			expect((yield* retiring(HAND)).status).toBe("succeeded");

			const agent = yield* db.Agent.where({ id: HAND }).first();
			expect(Option.getOrThrow(agent).status).toBe("retired");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: the row still says a live execution is running and nothing is holding
// it — the tree nobody can settle. Retirement is its only way out, so the guard
// asks the weak question rather than full rest: gating on a tree that has gone
// quiet would seal the exit shut and leave the berth held forever.
it.live("retiring an agent whose tree is stranded is not refused", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Agent.create({
					charter: "sound the northern shoals",
					currentSessionId: `session-${STRANDED}`,
					id: STRANDED,
					role: "hand",
					status: "alive",
				}).pipe(
					Effect.andThen(
						db.AgentSession.create({
							agentId: STRANDED,
							backend: "scripted",
							charterDeliveredAt: new Date(1),
							createdAt: new Date(1),
							cwd: `/tmp/${STRANDED}`,
							executionStatus: "active",
							id: `session-${STRANDED}`,
							nativeRef: `native-${STRANDED}`,
							parentSessionId: null,
							rootSessionId: `session-${STRANDED}`,
							status: "open",
						} satisfies NewAgentSession),
					),
				),
			);

			expect((yield* retiring(STRANDED)).status).toBe("succeeded");

			const agent = yield* db.Agent.where({ id: STRANDED }).first();
			expect(Option.getOrThrow(agent).status).toBe("retired");
			const session = yield* db.AgentSession.where({
				id: `session-${STRANDED}`,
			}).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
