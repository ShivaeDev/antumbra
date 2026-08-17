import { BoardScope, EntryInput } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, ManagedRuntime, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { drainActiveSessions } from "#session-shutdown.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	rawOf,
	sessionFor,
} from "#test/harness.ts";
import {
	reportsNativeRef,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";
import { eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

const countAttachmentCloses = (
	backend: AgentBackend,
	closes: Ref.Ref<number>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		backend
			.openSession(options)
			.pipe(
				Effect.tap(() =>
					Effect.addFinalizer(() => Ref.update(closes, (count) => count + 1)),
				),
			),
});

it.live("drains every active Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const runtime = ManagedRuntime.make(
			domainKernelLayer(temporary, scripted.backend),
		);
		yield* Effect.promise(() =>
			runtime.runPromise(
				Effect.gen(function* () {
					const db = yield* Database;
					const domain = yield* AgentDomain;
					const kernel = yield* Kernel;
					const identities = [
						{ agentId: "shutdown-one", sessionId: "shutdown-session-one" },
						{ agentId: "shutdown-two", sessionId: "shutdown-session-two" },
					];
					for (const identity of identities) {
						const submission = yield* kernel.submit(domain.spawn, {
							...identity,
							backend: "scripted",
							charter: "hold until shutdown",
							role: "hand",
							runner: "local",
						});
						expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
					}
					const attachments = yield* Effect.forEach(identities, (identity) =>
						sessionFor(scripted, identity.agentId),
					);

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
					expect(
						yield* Effect.forEach(attachments, (live) => live.closed),
					).toEqual([true, true]);
					expect(yield* db.Agent.all()).toHaveLength(2);
					expect(yield* db.Moorage.all()).toHaveLength(2);
				}),
			),
		);
		yield* Effect.promise(() => runtime.dispose());
	}),
);

it.live(
	"drains once, rebuilds idle truth, and resumes the same native Session",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const closes = yield* Ref.make(0);
			const counted = countAttachmentCloses(scripted.backend, closes);
			const firstRuntime = ManagedRuntime.make(
				domainKernelLayer(temporary, counted),
			);
			const prepareShutdown = Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const voyage = yield* openReefVoyage;
				const hailed = yield* domain.voyages.hail(voyage.id);
				const live = yield* eventually(sessionFor(scripted, hailed.agentId));
				yield* domain.boards.write(
					BoardScope.Agent({ agentId: hailed.agentId }),
					EntryInput.Note({
						authorAgentId: Option.none(),
						body: "preserve this board through shutdown",
						register: "smooth",
					}),
				);
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
				const sessionHasDurableEvents = Effect.gen(function* () {
					const sessions = yield* db.AgentSession.where({
						agentId: hailed.agentId,
					}).all();
					const session = Option.getOrThrow(
						Option.fromUndefinedOr(sessions[0]),
					);
					expect(session.nativeRef).toBe("native-shutdown");
					expect(
						yield* db.SessionEvent.where({ sessionId: session.id }).all(),
					).toHaveLength(2);
				});
				yield* eventually(sessionHasDurableEvents);
				const session = Option.getOrThrow(
					Option.fromUndefinedOr(
						(yield* db.AgentSession.where({
							agentId: hailed.agentId,
						}).all())[0],
					),
				);
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
					session,
				};
				yield* drainActiveSessions;
				expect(yield* live.closed).toBe(true);
				return { agentId: hailed.agentId, durable, voyageId: voyage.id };
			});
			const before = yield* Effect.promise(() =>
				firstRuntime.runPromise(prepareShutdown),
			);
			yield* Effect.promise(() => firstRuntime.dispose());
			expect(yield* Ref.get(closes)).toBe(1);

			const resumedBackend = reportsNativeRef(
				counted,
				scripted,
				"native-shutdown",
			);
			const secondRuntime = ManagedRuntime.make(
				domainKernelLayer(temporary, resumedBackend),
			);
			const verifyResume = Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const idle = Option.getOrThrow(
					yield* db.AgentSession.where({
						id: before.durable.session.id,
					}).first(),
				);
				expect(idle).toEqual({
					...before.durable.session,
					executionStatus: "idle",
				});
				expect(yield* db.Agent.where({ id: before.agentId }).first()).toEqual(
					before.durable.agent,
				);
				expect(
					yield* db.Moorage.where({ agentId: before.agentId }).first(),
				).toEqual(before.durable.moorage);
				expect(yield* db.Board.all()).toEqual(before.durable.boards);
				expect(yield* db.BoardEntry.all()).toEqual(before.durable.boardEntries);
				expect(yield* db.BoardOwner.all()).toEqual(before.durable.boardOwners);
				expect(
					yield* db.SessionEvent.where({ sessionId: idle.id }).all(),
				).toEqual(before.durable.events);

				const hailed = yield* domain.voyages.hail(before.voyageId);
				expect(hailed.agentId).toBe(before.agentId);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* scripted.opened).toHaveLength(2);
					}),
				);
				const reopened = (yield* scripted.opened)[1];
				expect(reopened?.sessionId).toBe(idle.id);
				expect(reopened?.resume).toEqual(Option.some("native-shutdown"));
				expect(yield* db.Agent.all()).toHaveLength(1);
				expect(yield* db.AgentSession.all()).toHaveLength(1);
			});
			yield* Effect.promise(() => secondRuntime.runPromise(verifyResume));
			yield* Effect.promise(() => secondRuntime.dispose());
		}),
);
