import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { it } from "@antumbra/testing";
import { expect, it as vitest } from "@effect/vitest";
import { Effect, Fiber, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { drainActiveSessions } from "#shutdown.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { reportsNativeRef, untilTerminal } from "#test/session-recovery-fixture.ts";
import { openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

const spawnHeld = (identity: { readonly agentId: string; readonly sessionId: string }) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.spawn, {
			...identity,
			backend: "scripted",
			charter: "hold until shutdown",
			role: "hand",
			runner: "local",
		});
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
	});

const countAttachmentCloses = (backend: AgentBackend, closes: Ref.Ref<number>): AgentBackend => ({
	...backend,
	openSession: (options) => backend.openSession(options).pipe(Effect.tap(() => Effect.addFinalizer(() => Ref.update(closes, (count) => count + 1)))),
});

it.effectApp("drains every active Session", function* ({ scripted }) {
	const db = yield* Database;
	const identities = [
		{ agentId: "shutdown-one", sessionId: "shutdown-session-one" },
		{ agentId: "shutdown-two", sessionId: "shutdown-session-two" },
	];
	yield* Effect.forEach(identities, spawnHeld);
	const attachments = yield* Effect.forEach(identities, (identity) => sessionFor(scripted, identity.agentId));

	yield* drainActiveSessions;

	expect(
		(yield* db.AgentSession.all()).map((session) => ({
			id: session.id,
			status: session.executionStatus,
		})),
	).toEqual([
		{ id: "shutdown-session-one", status: "idle" },
		{ id: "shutdown-session-two", status: "idle" },
	]);
	expect(yield* Effect.forEach(attachments, (live) => live.closed)).toEqual([true, true]);
	expect(yield* db.Agent.all()).toHaveLength(2);
	expect(yield* db.Moorage.all()).toHaveLength(2);
});

vitest.effect("leaves a stranded Session active while draining the attached one", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* spawnHeld({ agentId: "stranded", sessionId: "stranded-session" }).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* spawnHeld({ agentId: "attached", sessionId: "attached-session" });

			yield* drainActiveSessions;

			expect((yield* db.AgentSession.all()).map((session) => ({ id: session.id, status: session.executionStatus }))).toEqual([
				{ id: "stranded-session", status: "active" },
				{ id: "attached-session", status: "idle" },
			]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

vitest.effect("drains once, rebuilds idle truth, and resumes the same native Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const closes = yield* Ref.make(0);
		const counted = countAttachmentCloses(scripted.backend, closes);
		const prepareShutdown = Effect.gen(function* () {
			const db = yield* Database;
			const procedures = yield* VoyageProcedureService;
			const boards = yield* Boards;
			const sight = yield* makeSightSessionEvents;
			const voyage = yield* openReefVoyage;
			const hailed = yield* procedures.hail(voyage.id);
			expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
			const live = yield* sessionFor(scripted, hailed.agentId);
			yield* boards.write(
				BoardScope.Agent({ agentId: hailed.agentId }),
				EntryInput.Note({
					authorAgentId: Option.none(),
					body: "preserve this board through shutdown",
					register: "smooth",
				}),
			);
			const session = Option.getOrThrow(Option.fromUndefinedOr((yield* db.AgentSession.where({ agentId: hailed.agentId }).all())[0]));
			const recorded = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: session.id }).pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);
			yield* live.emit({
				nativeRef: "native-shutdown",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* live.emit({
				raw: rawOf("assistant/message"),
				role: "agent",
				text: "durable before shutdown",
				type: "message",
			});
			expect((yield* Fiber.join(recorded)).map((event) => event.event)).toMatchObject([
				{ _tag: "Known", event: { type: "session.opened" } },
				{ _tag: "Known", event: { type: "message" } },
			]);
			const persistedSession = Option.getOrThrow(yield* db.AgentSession.where({ id: session.id }).first());
			expect(persistedSession.nativeRef).toBe("native-shutdown");
			const durable = {
				agent: yield* db.Agent.where({ id: hailed.agentId }).first(),
				boardEntries: yield* db.BoardEntry.all(),
				boardOwners: yield* db.BoardOwner.all(),
				boards: yield* db.Board.all(),
				events: yield* db.SessionEvent.where({
					sessionId: session.id,
				}).all(),
				moorage: yield* db.Moorage.where({
					agentId: hailed.agentId,
				}).first(),
				session: persistedSession,
			};
			yield* drainActiveSessions;
			expect(yield* live.closed).toBe(true);
			return { agentId: hailed.agentId, durable, voyageId: voyage.id };
		});
		const before = yield* prepareShutdown.pipe(Effect.provide(domainKernelLayer(temporary, counted)));
		expect(yield* Ref.get(closes)).toBe(1);

		const resumedBackend = reportsNativeRef(counted, scripted, "native-shutdown");
		const verifyResume = Effect.gen(function* () {
			const db = yield* Database;
			const procedures = yield* VoyageProcedureService;
			const idle = Option.getOrThrow(
				yield* db.AgentSession.where({
					id: before.durable.session.id,
				}).first(),
			);
			expect(idle).toEqual({
				...before.durable.session,
				executionStatus: "idle",
			});
			expect(yield* db.Agent.where({ id: before.agentId }).first()).toEqual(before.durable.agent);
			expect(yield* db.Moorage.where({ agentId: before.agentId }).first()).toEqual(before.durable.moorage);
			expect(yield* db.Board.all()).toEqual(before.durable.boards);
			expect(yield* db.BoardEntry.all()).toEqual(before.durable.boardEntries);
			expect(yield* db.BoardOwner.all()).toEqual(before.durable.boardOwners);
			expect(yield* db.SessionEvent.where({ sessionId: idle.id }).all()).toEqual(before.durable.events);

			const hailed = yield* procedures.hail(before.voyageId);
			expect(hailed.agentId).toBe(before.agentId);
			expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
			expect(yield* scripted.opened).toHaveLength(2);
			const reopened = (yield* scripted.opened)[1];
			expect(reopened?.sessionId).toBe(idle.id);
			expect(reopened?.resume).toEqual(Option.some("native-shutdown"));
			expect(yield* db.Agent.all()).toHaveLength(1);
			expect(yield* db.AgentSession.all()).toHaveLength(1);
		});
		yield* verifyResume.pipe(Effect.provide(domainKernelLayer(temporary, resumedBackend)));
	}),
);
