import { BoardScope, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import {
	aliveAgent,
	eventually,
	openReefVoyage,
	retireOneAlive,
	seedSpawningCaptain,
	sessionIdOf,
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
	"request_ruling",
	"rule_on",
	"pass_up",
	"reclassify_ruling",
	"stand_down",
	"read_rulings",
];

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
				sessionId: yield* sessionIdOf(hailed.agentId),
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
			).toBe("agent/wake");
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
			const voyage = yield* openReefVoyage;
			yield* seedSpawningCaptain(voyage.id);

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

				yield* retireOneAlive(scripted);
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
					sessionId: yield* sessionIdOf(second.agentId),
					status: "alive",
				});
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);
