import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, standDown } from "#test/harness.ts";
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

const seedRetirementRows = (input: {
	readonly agentId: string;
	readonly agentStatus: string;
	readonly currentSessionId: string | null;
	readonly executionStatus: string;
	readonly sessionId: string;
}) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "sound the northern shoals",
			currentSessionId: input.currentSessionId,
			id: input.agentId,
			role: "hand",
			status: input.agentStatus,
		});
		yield* db.AgentSession.create({
			agentId: input.agentId,
			backend: "scripted",
			charterDeliveredAt: new Date(1),
			createdAt: new Date(1),
			cwd: `/tmp/${input.agentId}`,
			executionStatus: input.executionStatus,
			id: input.sessionId,
			nativeRef: `native-${input.agentId}`,
			parentSessionId: null,
			rootSessionId: input.sessionId,
			status: "open",
		} satisfies NewAgentSession);
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
			yield* seedRetirementRows({
				agentId: STRANDED,
				agentStatus: "alive",
				currentSessionId: `session-${STRANDED}`,
				executionStatus: "active",
				sessionId: `session-${STRANDED}`,
			});

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

it.live("a retried retirement closes Sessions left behind the terminal row", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const agentId = "agent-retired-prefix";
		const sessionId = "session-retired-prefix";
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* seedRetirementRows({
				agentId,
				agentStatus: "retired",
				currentSessionId: null,
				executionStatus: "idle",
				sessionId,
			});

			expect((yield* retiring(agentId)).status).toBe("succeeded");
			expect(Option.getOrThrow(yield* db.AgentSession.where({ id: sessionId }).first()).status).toBe("closed");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
