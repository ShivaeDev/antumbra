import { BoardScope, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
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
				status: "alive",
			});

			const live = yield* sessionFor(scripted, hailed.agentId);
			expect(live.tools.map((tool) => tool.name)).toEqual(CAPTAIN_TOOLS);
			expect((yield* live.sent)[0]).toContain("the eastern approach is safe");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a voyage whose captain is at work refuses a second hail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const hailed = yield* domain.voyages.hail(voyage.id);
			yield* eventually(aliveAgent(hailed.agentId));

			const refusal = yield* Effect.flip(domain.voyages.hail(voyage.id));
			expect(refusal).toMatchObject({
				_tag: "CaptainAlreadyHailed",
				agentId: hailed.agentId,
			});
			expect(
				yield* Effect.flip(domain.voyages.hail("no-such-voyage")),
			).toMatchObject({ _tag: "VoyageNotFound" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live(
	"hailing an idle captain resumes its exact Session and native thread",
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
					status: "alive",
				});
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);
