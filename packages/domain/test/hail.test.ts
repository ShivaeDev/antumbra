import { BoardScope, EntryInput } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	domainKernelLayer,
	makeScriptedBackend,
	rawOf,
	sessionFor,
} from "#test/harness.ts";
import {
	RECOVERY_INSTRUCTION,
	reportsNativeRef,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";
import {
	eventually,
	openReefVoyage,
	retireOneAlive,
} from "#test/voyage-fixtures.ts";

const CAPTAIN_TOOLS = [
	"charter_piece",
	"launch_piece",
	"park_piece",
	"unpark_piece",
	"rewire_piece",
	"read_voyage",
	"read_report",
	"read_mail",
	"mark_read",
	"write_board",
	"read_board",
	"stand_down",
];

const aliveAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agent = Option.getOrThrow(
			yield* db.Agent.where({ id: agentId }).first(),
		);
		expect(agent.status).toBe("alive");
		return agent;
	});

it.live("hailing a voyage brings it a captain and puts it under way", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			yield* domain.boards.write(
				BoardScope.Voyage({ voyageId: voyage.id }),
				EntryInput.Note({
					authorAgentId: Option.none(),
					body: "the eastern approach is safe",
					register: "smooth",
				}),
			);

			const hailed = yield* domain.voyages.hail(voyage.id);
			const captain = yield* eventually(aliveAgent(hailed.agentId));
			expect(captain.role).toBe("captain");
			expect(yield* db.VoyageAgent.all()).toMatchObject([
				{ agentId: hailed.agentId, role: "captain", voyageId: voyage.id },
			]);

			const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
			expect(view.state).toBe("underWay");
			expect(Option.getOrThrow(view.captain)).toEqual({
				agentId: hailed.agentId,
				atWork: true,
				status: "alive",
			});

			const live = yield* sessionFor(scripted, hailed.agentId);
			expect(live.tools.map((tool) => tool.name)).toEqual(CAPTAIN_TOOLS);
			expect((yield* live.sent)[0]).toContain("the eastern approach is safe");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a second hail reaches the captain the voyage already has", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const hailed = yield* domain.voyages.hail(voyage.id);
			yield* eventually(aliveAgent(hailed.agentId));

			const again = yield* domain.voyages.hail(voyage.id);
			expect(again.agentId).toBe(hailed.agentId);
			expect(
				Option.getOrThrow(
					yield* db.Intent.where({ id: again.intentId }).first(),
				).tag,
			).toBe("agent/recover");
			expect(yield* db.Agent.all()).toHaveLength(1);
			expect(yield* db.VoyageAgent.all()).toHaveLength(1);
			expect(
				yield* Effect.flip(domain.voyages.hail("no-such-voyage")),
			).toMatchObject({ _tag: "VoyageNotFound" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a hail is refused while the voyage's captain is being born", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const writer = yield* Writer;
			const voyage = yield* openReefVoyage;
			yield* writer.write(
				db.Agent.create({
					charter: "chart the reef",
					currentSessionId: null,
					id: "captain-newborn",
					role: "captain",
					status: "spawning",
				}).pipe(
					Effect.andThen(
						db.VoyageAgent.create({
							agentId: "captain-newborn",
							role: "captain",
							voyageId: voyage.id,
						}),
					),
				),
			);

			const refusal = yield* Effect.flip(domain.voyages.hail(voyage.id));
			expect(refusal).toMatchObject({
				_tag: "CaptainAlreadyHailed",
				agentId: "captain-newborn",
			});
			expect(refusal.message).toBe(
				`voyage ${voyage.id} already has captain captain-newborn at work`,
			);
			expect(yield* db.Agent.all()).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live(
	"hailing an idle captain reaches the Session it is already standing in",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-captain",
			);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const voyage = yield* openReefVoyage;
				const first = yield* domain.voyages.hail(voyage.id);
				yield* eventually(aliveAgent(first.agentId));
				const initial = yield* sessionFor(scripted, first.agentId);
				yield* initial.emit({
					nativeRef: "native-captain",
					raw: rawOf("session/opened"),
					type: "session.opened",
				});
				yield* eventually(
					Effect.gen(function* () {
						const session = (yield* db.AgentSession.where({
							agentId: first.agentId,
						}).all())[0];
						expect(session?.nativeRef).toBe("native-captain");
					}),
				);
				const sessionBefore = Option.getOrThrow(
					Option.fromUndefinedOr(
						(yield* db.AgentSession.where({ agentId: first.agentId }).all())[0],
					),
				);
				yield* callTool(initial, "stand_down", undefined);
				yield* eventually(
					Effect.gen(function* () {
						const session = Option.getOrThrow(
							yield* db.AgentSession.where({ id: sessionBefore.id }).first(),
						);
						expect(session.executionStatus).toBe("idle");
					}),
				);

				const sleeping = Option.getOrThrow(
					yield* domain.voyages.read(voyage.id),
				);
				expect(Option.getOrThrow(sleeping.captain)).toEqual({
					agentId: first.agentId,
					atWork: false,
					status: "alive",
				});

				const resumed = yield* domain.voyages.hail(voyage.id);
				expect(resumed.agentId).toBe(first.agentId);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* initial.sent).toContain(RECOVERY_INSTRUCTION);
					}),
				);
				// why: an idle captain never left, so the hail reaches it where it
				// stands rather than opening a second conversation over the first.
				expect(yield* scripted.opened).toHaveLength(1);
				expect(yield* initial.closed).toBe(false);
				expect(yield* db.Agent.all()).toHaveLength(1);
				expect(yield* db.AgentSession.all()).toHaveLength(1);
				expect(yield* db.VoyageAgent.all()).toHaveLength(1);
				expect(
					Option.getOrThrow(
						yield* db.AgentSession.where({ id: sessionBefore.id }).first(),
					).executionStatus,
				).toBe("active");
			}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
		}),
);

// why: once the clock has taken the process away the captain is asleep, and the
// hail is what brings it back — into the same Session and the same provider
// thread, because a hail resumes a conversation rather than starting one.
it.live("hailing an asleep captain resumes its exact Session and native thread", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(
			scripted.backend,
			scripted,
			"native-captain",
		);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const voyage = yield* openReefVoyage;
			const first = yield* domain.voyages.hail(voyage.id);
			yield* eventually(aliveAgent(first.agentId));
			const initial = yield* sessionFor(scripted, first.agentId);
			yield* initial.emit({
				nativeRef: "native-captain",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* eventually(
				Effect.gen(function* () {
					const session = (yield* db.AgentSession.where({
						agentId: first.agentId,
					}).all())[0];
					expect(session?.nativeRef).toBe("native-captain");
				}),
			);
			const sessionBefore = Option.getOrThrow(
				Option.fromUndefinedOr(
					(yield* db.AgentSession.where({ agentId: first.agentId }).all())[0],
				),
			);
			yield* callTool(initial, "stand_down", undefined);
			// why: the siesta stands in for the hour the clock would otherwise
			// have to pass; the threshold itself is rehearsed where it lives.
			const siesta = yield* kernel.submit(domain.siesta, {
				sessionId: sessionBefore.id,
			});
			expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* initial.closed).toBe(true);
				}),
			);

			const resumed = yield* domain.voyages.hail(voyage.id);
			expect(resumed.agentId).toBe(first.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
					const current = yield* sessionFor(scripted, first.agentId);
					expect(yield* current.sent).toEqual([RECOVERY_INSTRUCTION]);
				}),
			);
			const secondOpen = (yield* scripted.opened)[1];
			expect(secondOpen?.sessionId).toBe(sessionBefore.id);
			expect(secondOpen?.resume).toEqual(Option.some("native-captain"));
			expect(yield* db.Agent.all()).toHaveLength(1);
			expect(yield* db.AgentSession.all()).toHaveLength(1);
			expect(yield* db.VoyageAgent.all()).toHaveLength(1);
			expect(
				Option.getOrThrow(
					yield* db.AgentSession.where({ id: sessionBefore.id }).first(),
				).executionStatus,
			).toBe("active");
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);

it.live(
	"a retired captain is history, and the voyage may be hailed again",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const voyage = yield* openReefVoyage;
				const first = yield* domain.voyages.hail(voyage.id);
				yield* eventually(aliveAgent(first.agentId));

				yield* retireOneAlive;
				yield* eventually(
					Effect.gen(function* () {
						const view = Option.getOrThrow(
							yield* domain.voyages.read(voyage.id),
						);
						expect(view.state).toBe("quiet");
					}),
				);

				const second = yield* domain.voyages.hail(voyage.id);
				expect(second.agentId).not.toBe(first.agentId);
				yield* eventually(aliveAgent(second.agentId));

				expect((yield* db.VoyageAgent.all()).length).toBe(2);
				const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
				expect(Option.getOrThrow(view.captain)).toEqual({
					agentId: second.agentId,
					atWork: true,
					status: "alive",
				});
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);
